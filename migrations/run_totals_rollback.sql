-- Phase 7A-1: Run Totals Table - Rollback Migration
-- Safely removes run_totals table and related objects

-- Drop index first (safer order)
DROP INDEX IF EXISTS totals_user_month_idx;

-- Drop table and all constraints
DROP TABLE IF EXISTS run_totals;

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'run_totals') THEN
    RAISE NOTICE 'run_totals table and related objects successfully removed';
  ELSE
    RAISE EXCEPTION 'Rollback failed: run_totals table still exists';
  END IF;
END $$;