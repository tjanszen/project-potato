#!/bin/bash

# ========================================
# Phase 6B-4: Stress Test Retry Logic
# Simulates high concurrent load for deadlock and retry testing
# ========================================

set -euo pipefail

# Default configuration
CONCURRENT_USERS=10
OPERATIONS_PER_USER=50
DURATION=30
DATABASE_URL="${DATABASE_URL:-}"
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --concurrent-users=*)
            CONCURRENT_USERS="${1#*=}"
            shift
            ;;
        --operations-per-user=*)
            OPERATIONS_PER_USER="${1#*=}"
            shift
            ;;
        --duration=*)
            DURATION="${1#*=}"
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --concurrent-users=N     Number of concurrent users (default: 10)"
            echo "  --operations-per-user=N  Operations per user (default: 50)"
            echo "  --duration=N            Test duration in seconds (default: 30)"
            echo "  --verbose               Enable verbose output"
            echo "  --help                  Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate configuration
if [[ -z "$DATABASE_URL" ]]; then
    echo "Error: DATABASE_URL environment variable is required"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

echo "========================================"
echo "Phase 6B-4: Stress Test Configuration"
echo "========================================"
echo "Concurrent Users: $CONCURRENT_USERS"
echo "Operations per User: $OPERATIONS_PER_USER"
echo "Test Duration: ${DURATION}s"
echo "Database: ${DATABASE_URL}"
echo "Verbose: $VERBOSE"
echo "========================================"

# Create temporary directory for test results
TEST_DIR=$(mktemp -d)
echo "Test results directory: $TEST_DIR"

# Function to clean up on exit
cleanup() {
    echo "Cleaning up..."
    if [[ -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
    # Kill any remaining background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT

# Function to create test user
create_test_user() {
    local user_id=$1
    local email="stress-user-${user_id}@test.com"
    
    psql "$DATABASE_URL" -c "
        INSERT INTO users (email, password_hash, timezone) 
        VALUES ('$email', 'test-hash', 'America/New_York')
        ON CONFLICT (email) DO NOTHING;
    " &>/dev/null
    
    echo "$email"
}

# Function to perform concurrent day marking for a user
stress_test_user() {
    local user_email=$1
    local user_id=$2
    local operations=$3
    local results_file="$TEST_DIR/user_${user_id}_results.txt"
    
    echo "Starting stress test for user: $user_email" >> "$results_file"
    echo "timestamp,operation,duration_ms,status,retry_count" >> "$results_file"
    
    for ((op=1; op<=operations; op++)); do
        # Calculate test date (spread across different days)
        local date_offset=$((op % 30))
        local test_date=$(date -d "+${date_offset} days" '+%Y-%m-%d')
        
        # Measure operation timing
        local start_time=$(date +%s%3N)
        
        # Perform day marking with retry simulation
        local retry_count=0
        local max_retries=3
        local success=false
        
        while [[ $retry_count -le $max_retries && $success == false ]]; do
            if psql "$DATABASE_URL" -c "
                INSERT INTO day_marks (user_id, date, value) 
                SELECT id, '$test_date', true 
                FROM users 
                WHERE email = '$user_email'
                ON CONFLICT (user_id, date) DO UPDATE SET 
                    value = EXCLUDED.value,
                    updated_at = CURRENT_TIMESTAMP;
            " &>/dev/null; then
                success=true
            else
                ((retry_count++))
                # Exponential backoff
                sleep "0.$((retry_count * retry_count))"
            fi
        done
        
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        local status=$([ "$success" == true ] && echo "SUCCESS" || echo "FAILED")
        
        echo "$(date -Iseconds),$op,${duration},$status,$retry_count" >> "$results_file"
        
        if [[ $VERBOSE == true ]]; then
            echo "User $user_id Op $op: $status (${duration}ms, ${retry_count} retries)"
        fi
        
        # Small random delay to simulate realistic usage patterns
        sleep "0.0$(shuf -i 1-9 -n 1)"
    done
    
    echo "Completed stress test for user: $user_email" >> "$results_file"
}

# Function to validate database invariants
validate_invariants() {
    local violations_file="$TEST_DIR/invariant_violations.txt"
    
    echo "Validating database invariants..." > "$violations_file"
    
    # Check for overlapping runs
    local overlapping_runs=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM runs a
        JOIN runs b ON a.user_id = b.user_id AND a.id < b.id
        WHERE a.span && b.span;
    " | xargs)
    
    echo "Overlapping runs: $overlapping_runs" >> "$violations_file"
    
    # Check for multiple active runs per user
    local multiple_active=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM (
            SELECT user_id, COUNT(*) as active_count
            FROM runs 
            WHERE active = true 
            GROUP BY user_id 
            HAVING COUNT(*) > 1
        ) q;
    " | xargs)
    
    echo "Users with multiple active runs: $multiple_active" >> "$violations_file"
    
    # Check day count accuracy
    local day_count_errors=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM runs 
        WHERE day_count != (upper(span) - lower(span));
    " | xargs)
    
    echo "Day count mismatches: $day_count_errors" >> "$violations_file"
    
    local total_violations=$((overlapping_runs + multiple_active + day_count_errors))
    echo "Total invariant violations: $total_violations" >> "$violations_file"
    
    return $total_violations
}

# Main stress test execution
echo "Creating test users..."
user_emails=()
for ((i=1; i<=CONCURRENT_USERS; i++)); do
    email=$(create_test_user $i)
    user_emails+=("$email")
    if [[ $VERBOSE == true ]]; then
        echo "Created user: $email"
    fi
done

echo "Starting concurrent stress test..."
start_time=$(date +%s)

# Launch concurrent user operations
pids=()
for ((i=1; i<=CONCURRENT_USERS; i++)); do
    user_email="${user_emails[$((i-1))]}"
    stress_test_user "$user_email" "$i" "$OPERATIONS_PER_USER" &
    pids+=($!)
done

# Monitor test progress
monitor_interval=5
while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    
    if [[ $elapsed -ge $DURATION ]]; then
        echo "Test duration reached (${DURATION}s). Stopping test..."
        break
    fi
    
    # Count running processes
    running_count=0
    for pid in "${pids[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            ((running_count++))
        fi
    done
    
    if [[ $running_count -eq 0 ]]; then
        echo "All user operations completed in ${elapsed}s"
        break
    fi
    
    echo "Progress: ${elapsed}s elapsed, $running_count users still running..."
    sleep $monitor_interval
done

# Wait for any remaining processes
echo "Waiting for remaining operations to complete..."
for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
        wait "$pid" || true
    fi
done

end_time=$(date +%s)
total_duration=$((end_time - start_time))

echo "========================================"
echo "Stress Test Results Summary"
echo "========================================"
echo "Total Duration: ${total_duration}s"

# Aggregate results
total_operations=0
successful_operations=0
failed_operations=0
total_retries=0
response_times=()

for ((i=1; i<=CONCURRENT_USERS; i++)); do
    results_file="$TEST_DIR/user_${i}_results.txt"
    if [[ -f "$results_file" ]]; then
        # Skip header and summary lines
        while IFS=',' read -r timestamp operation duration status retry_count; do
            if [[ "$timestamp" =~ ^[0-9]{4}- ]]; then
                ((total_operations++))
                if [[ "$status" == "SUCCESS" ]]; then
                    ((successful_operations++))
                else
                    ((failed_operations++))
                fi
                total_retries=$((total_retries + retry_count))
                response_times+=("$duration")
            fi
        done < "$results_file"
    fi
done

# Calculate statistics
if [[ ${#response_times[@]} -gt 0 ]]; then
    # Sort response times for percentile calculation
    IFS=$'\n' sorted_times=($(printf '%s\n' "${response_times[@]}" | sort -n))
    
    # Calculate average
    sum=0
    for time in "${response_times[@]}"; do
        sum=$((sum + time))
    done
    avg_response_time=$((sum / ${#response_times[@]}))
    
    # Calculate percentiles
    p95_index=$(( ${#sorted_times[@]} * 95 / 100 ))
    p99_index=$(( ${#sorted_times[@]} * 99 / 100 ))
    p95_response_time="${sorted_times[$p95_index]:-0}"
    p99_response_time="${sorted_times[$p99_index]:-0}"
else
    avg_response_time=0
    p95_response_time=0
    p99_response_time=0
fi

echo "Total Operations: $total_operations"
echo "Successful Operations: $successful_operations"
echo "Failed Operations: $failed_operations"
echo "Success Rate: $(echo "scale=2; $successful_operations * 100 / $total_operations" | bc -l)%"
echo "Total Retries: $total_retries"
echo "Average Response Time: ${avg_response_time}ms"
echo "95th Percentile Response Time: ${p95_response_time}ms"
echo "99th Percentile Response Time: ${p99_response_time}ms"

# Validate invariants
echo "========================================"
echo "Invariant Validation"
echo "========================================"
validate_invariants
validation_exit_code=$?

if [[ -f "$TEST_DIR/invariant_violations.txt" ]]; then
    cat "$TEST_DIR/invariant_violations.txt"
fi

# Clean up test data
echo "========================================"
echo "Cleaning up test data..."
echo "========================================"
for user_email in "${user_emails[@]}"; do
    psql "$DATABASE_URL" -c "
        DELETE FROM day_marks 
        WHERE user_id IN (SELECT id FROM users WHERE email = '$user_email');
        DELETE FROM runs 
        WHERE user_id IN (SELECT id FROM users WHERE email = '$user_email');
        DELETE FROM users WHERE email = '$user_email';
    " &>/dev/null
done

# Final assessment
echo "========================================"
echo "Final Assessment"
echo "========================================"

if [[ $validation_exit_code -eq 0 ]]; then
    echo "✅ PASS: No invariant violations detected"
else
    echo "❌ FAIL: $validation_exit_code invariant violations found"
fi

if [[ $failed_operations -eq 0 ]]; then
    echo "✅ PASS: All operations completed successfully"
elif [[ $failed_operations -lt $((total_operations / 10)) ]]; then
    echo "⚠️  PARTIAL: $failed_operations failed operations (< 10% failure rate)"
else
    echo "❌ FAIL: High failure rate ($failed_operations failed operations)"
fi

if [[ $avg_response_time -lt 500 ]]; then
    echo "✅ PASS: Average response time under 500ms"
else
    echo "⚠️  SLOW: Average response time ${avg_response_time}ms exceeds 500ms target"
fi

echo "========================================"
echo "Stress test completed!"
echo "Test results saved in: $TEST_DIR"
echo "========================================"