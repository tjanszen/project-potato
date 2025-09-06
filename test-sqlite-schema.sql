-- SQLite Schema Test Script for Phase 6A-2
-- This script demonstrates equivalent constraint enforcement to PostgreSQL

-- 1. Create users table (simplified for testing)
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL
);

-- 2. Create SQLite runs table with equivalent structure
CREATE TABLE runs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    start_date TEXT NOT NULL, -- YYYY-MM-DD format
    end_date TEXT NOT NULL,   -- YYYY-MM-DD format (inclusive)
    day_count INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 0, -- 0=false, 1=true
    last_extended_at INTEGER DEFAULT (unixepoch()),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    
    -- Check constraints equivalent to PostgreSQL
    CHECK (day_count = (julianday(end_date) - julianday(start_date) + 1)),
    CHECK (end_date >= start_date),
    CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    CHECK (end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create triggers to prevent overlapping spans (equivalent to EXCLUDE constraints)
CREATE TRIGGER prevent_overlap_insert
BEFORE INSERT ON runs
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM runs 
            WHERE user_id = NEW.user_id 
            AND NOT (NEW.end_date < start_date OR end_date < NEW.start_date)
        )
        THEN RAISE(ABORT, 'Overlapping run spans not allowed for user')
    END;
END;

CREATE TRIGGER prevent_overlap_update
BEFORE UPDATE ON runs
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM runs 
            WHERE user_id = NEW.user_id 
            AND id != NEW.id
            AND NOT (NEW.end_date < start_date OR end_date < NEW.start_date)
        )
        THEN RAISE(ABORT, 'Overlapping run spans not allowed for user')
    END;
END;

-- 4. Create triggers to prevent multiple active runs per user
CREATE TRIGGER prevent_multiple_active_insert
BEFORE INSERT ON runs
FOR EACH ROW WHEN NEW.active = 1
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM runs 
            WHERE user_id = NEW.user_id AND active = 1
        )
        THEN RAISE(ABORT, 'Only one active run allowed per user')
    END;
END;

CREATE TRIGGER prevent_multiple_active_update
BEFORE UPDATE ON runs
FOR EACH ROW WHEN NEW.active = 1
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM runs 
            WHERE user_id = NEW.user_id AND active = 1 AND id != NEW.id
        )
        THEN RAISE(ABORT, 'Only one active run allowed per user')
    END;
END;

-- 5. Trigger to update timestamp on UPDATE
CREATE TRIGGER update_timestamp
AFTER UPDATE ON runs
FOR EACH ROW
BEGIN
    UPDATE runs SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- 6. Test data setup
INSERT INTO users (id, email) VALUES ('test-user-1', 'test1@example.com');
INSERT INTO users (id, email) VALUES ('test-user-2', 'test2@example.com');

-- TEST CASES: These should demonstrate equivalent behavior to PostgreSQL

-- Test 1: Valid insertion (should succeed)
INSERT INTO runs (user_id, start_date, end_date, day_count, active)
VALUES ('test-user-1', '2025-06-01', '2025-06-03', 3, 1);

-- Test 2: Overlapping span insertion (should FAIL)
-- This should fail with: "Overlapping run spans not allowed for user"
INSERT INTO runs (user_id, start_date, end_date, day_count, active)
VALUES ('test-user-1', '2025-06-02', '2025-06-05', 4, 0);

-- Test 3: Multiple active runs (should FAIL) 
-- This should fail with: "Only one active run allowed per user"
INSERT INTO runs (user_id, start_date, end_date, day_count, active)
VALUES ('test-user-1', '2025-07-01', '2025-07-03', 3, 1);

-- Test 4: Valid non-overlapping run (should succeed)
INSERT INTO runs (user_id, start_date, end_date, day_count, active)
VALUES ('test-user-1', '2025-07-01', '2025-07-03', 3, 0);

-- Test 5: Different user, active run (should succeed)
INSERT INTO runs (user_id, start_date, end_date, day_count, active)
VALUES ('test-user-2', '2025-06-01', '2025-06-03', 3, 1);

-- VALIDATION QUERIES: Equivalent to PostgreSQL health checks

-- Check for overlapping spans (should return 0)
SELECT 'Overlapping spans' as check_name, COUNT(*) as violations
FROM runs r1
JOIN runs r2 ON r1.user_id = r2.user_id AND r1.id < r2.id
WHERE NOT (r1.end_date < r2.start_date OR r2.end_date < r1.start_date)

UNION ALL

-- Check for multiple active runs per user (should return 0)
SELECT 'Multiple active runs' as check_name, COUNT(*) as violations
FROM (
    SELECT user_id, COUNT(*) as active_count
    FROM runs
    WHERE active = 1
    GROUP BY user_id
    HAVING COUNT(*) > 1
) multi_active

UNION ALL

-- Check day count accuracy (should return 0)
SELECT 'Invalid day counts' as check_name, COUNT(*) as violations
FROM runs
WHERE day_count != (julianday(end_date) - julianday(start_date) + 1);

-- Show final state
SELECT 'Final state:' as info;
SELECT user_id, start_date, end_date, day_count, active FROM runs ORDER BY user_id, start_date;