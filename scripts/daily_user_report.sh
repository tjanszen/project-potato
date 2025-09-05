#!/bin/bash

# Daily User Report Script
# Usage: ./scripts/daily_user_report.sh
# 
# This script connects to the PostgreSQL database using $DATABASE_URL
# and generates a simple daily user signup report.
#
# Requirements:
# - DATABASE_URL environment variable must be set
# - psql command must be available

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please ensure DATABASE_URL is configured in your environment"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found"
    echo "PostgreSQL client tools are required to run this script"
    exit 1
fi

echo "📊 Daily User Report"
echo "==================="

# Get total users count
total_users=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) AS total_users FROM users;" | tr -d ' ')

if [ $? -eq 0 ]; then
    echo "Total Users Signed Up: $total_users"
else
    echo "❌ Error: Failed to query total users"
    exit 1
fi

# Get today's new signups
new_users_today=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) AS new_users_today FROM users WHERE DATE(created_at) = CURRENT_DATE;" | tr -d ' ')

if [ $? -eq 0 ]; then
    echo "New Users Today: $new_users_today"
else
    echo "❌ Error: Failed to query today's new users"
    exit 1
fi

echo "==================="
echo "Report generated at: $(date)"