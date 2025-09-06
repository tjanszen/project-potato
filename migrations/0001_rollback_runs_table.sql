-- Rollback Migration: Drop runs table and all constraints
-- Phase 6A-4: Rollback script for runs table
-- Safe rollback that preserves day_marks table integrity

-- Verify no data corruption will occur
DO $$
BEGIN
    -- Check that day_marks table exists and will not be affected
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'day_marks') THEN
        RAISE EXCEPTION 'Rollback safety check failed: day_marks table does not exist';
    END IF;
    
    -- Check that users table exists and will not be affected  
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Rollback safety check failed: users table does not exist';
    END IF;
    
    -- Verify that runs table exists before trying to drop it
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'runs') THEN
        RAISE NOTICE 'Runs table does not exist - rollback not needed';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Rollback safety checks passed - proceeding with runs table removal';
END $$;

-- Drop performance indexes first (safe order)
DROP INDEX IF EXISTS "runs_span_overlap_idx";
DROP INDEX IF EXISTS "runs_user_start_date_idx";
DROP INDEX IF EXISTS "runs_user_active_idx";  
DROP INDEX IF EXISTS "runs_user_end_date_idx";

-- Drop unique constraints
DROP INDEX IF EXISTS "unique_active_run";

-- Drop check constraints
ALTER TABLE IF EXISTS "runs" DROP CONSTRAINT IF EXISTS "span_check";
ALTER TABLE IF EXISTS "runs" DROP CONSTRAINT IF EXISTS "day_count_check";

-- Drop EXCLUDE constraint  
ALTER TABLE IF EXISTS "runs" DROP CONSTRAINT IF EXISTS "runs_user_id_span_excl";

-- Drop foreign key constraint
ALTER TABLE IF EXISTS "runs" DROP CONSTRAINT IF EXISTS "runs_user_id_users_id_fk";

-- Drop the runs table completely
DROP TABLE IF EXISTS "runs";

-- Verify rollback success and data integrity
DO $$
BEGIN
    -- Check that runs table is gone
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'runs') THEN
        RAISE EXCEPTION 'Rollback failed: runs table still exists';
    END IF;
    
    -- Verify day_marks table is intact
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'day_marks') THEN
        RAISE EXCEPTION 'Rollback caused data corruption: day_marks table missing';
    END IF;
    
    -- Verify users table is intact
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Rollback caused data corruption: users table missing';
    END IF;
    
    -- Check that day_marks data is still accessible (smoke test)
    PERFORM 1 FROM "day_marks" LIMIT 1;
    
    -- Check that users data is still accessible (smoke test)  
    PERFORM 1 FROM "users" LIMIT 1;
    
    RAISE NOTICE 'Rollback 0001_rollback_runs_table.sql completed successfully';
    RAISE NOTICE 'Data integrity verified: day_marks and users tables intact';
END $$;