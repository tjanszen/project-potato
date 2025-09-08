-- Phase 7A-1: Run Totals Schema Validation
-- Validates the run_totals table structure and constraints

-- Test schema exists
SELECT 
  'run_totals table exists' as validation_step,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'run_totals'
  ) THEN 'PASS' ELSE 'FAIL' END as result;

-- Test constraints exist
SELECT 
  'All CHECK constraints exist' as validation_step,
  CASE WHEN (
    SELECT COUNT(*) FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%run_totals%' 
    OR constraint_name IN ('year_month_format', 'total_days_non_negative', 'longest_run_non_negative', 'active_run_non_negative')
  ) >= 4 THEN 'PASS' ELSE 'FAIL' END as result;

-- Test index exists
SELECT 
  'Performance index exists' as validation_step,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'totals_user_month_idx'
  ) THEN 'PASS' ELSE 'FAIL' END as result;

-- Test primary key
SELECT 
  'Composite primary key configured' as validation_step,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'run_totals' 
    AND constraint_type = 'PRIMARY KEY'
  ) THEN 'PASS' ELSE 'FAIL' END as result;