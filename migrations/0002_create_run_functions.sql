-- Migration: Create run operation functions 
-- Phase 6B-1a: SQL functions for idempotent run operations
-- Safe to run multiple times (idempotent)

-- Load the run functions from external file
-- This approach keeps function definitions separate and maintainable

\echo 'Loading run operation functions...'

-- Read and execute the functions file
\i db/functions/runs.sql

-- Verify that functions were created successfully
DO $$
BEGIN
    -- Check that perform_run_extend function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'perform_run_extend'
        AND p.pronargs = 2  -- 2 parameters: user_id, local_date
    ) THEN
        RAISE EXCEPTION 'Migration failed: perform_run_extend function not created';
    END IF;
    
    -- Check that perform_run_merge function exists (placeholder)
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'perform_run_merge'
        AND p.pronargs = 3  -- 3 parameters: user_id, run1_id, run2_id
    ) THEN
        RAISE EXCEPTION 'Migration failed: perform_run_merge function not created';
    END IF;
    
    -- Check that perform_run_split function exists (placeholder)
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'perform_run_split'
        AND p.pronargs = 3  -- 3 parameters: user_id, run_id, split_date
    ) THEN
        RAISE EXCEPTION 'Migration failed: perform_run_split function not created';
    END IF;
    
    RAISE NOTICE 'Migration 0002_create_run_functions.sql completed successfully';
    RAISE NOTICE 'Functions created: perform_run_extend, perform_run_merge (placeholder), perform_run_split (placeholder)';
END $$;