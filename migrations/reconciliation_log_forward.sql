-- Phase 7A-2: Forward migration for reconciliation_log table
-- Creates reconciliation_log table with indexes and constraints

-- Create reconciliation_log table
CREATE TABLE IF NOT EXISTS reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  check_type TEXT NOT NULL,
  expected_value INTEGER,
  actual_value INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  processing_time_ms INTEGER,
  correlation_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Validation constraints
  CONSTRAINT recon_year_month_format CHECK (year_month ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT recon_status_values CHECK (status IN ('match', 'mismatch', 'corrected', 'error')),
  CONSTRAINT recon_check_type_values CHECK (check_type IN ('total_days', 'longest_run', 'active_run')),
  CONSTRAINT recon_processing_time_non_negative CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0)
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS recon_user_month_idx ON reconciliation_log(user_id, year_month);
CREATE INDEX IF NOT EXISTS recon_status_idx ON reconciliation_log(status);
CREATE INDEX IF NOT EXISTS recon_created_at_idx ON reconciliation_log(created_at);
CREATE INDEX IF NOT EXISTS recon_correlation_idx ON reconciliation_log(correlation_id);

-- Insert migration record
INSERT INTO schema_migrations (filename, applied_at) 
VALUES ('reconciliation_log_forward.sql', NOW())
ON CONFLICT (filename) DO NOTHING;