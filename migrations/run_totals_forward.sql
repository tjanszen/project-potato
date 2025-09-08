-- Phase 7A-1: Run Totals Table - Forward Migration
-- Creates run_totals table for hybrid totals strategy (real-time current stats + stored monthly aggregates)

CREATE TABLE IF NOT EXISTS run_totals (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 0,
  longest_run_days INTEGER NOT NULL DEFAULT 0,
  active_run_days INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, year_month),
  CONSTRAINT year_month_format CHECK (year_month ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT total_days_non_negative CHECK (total_days >= 0),
  CONSTRAINT longest_run_non_negative CHECK (longest_run_days >= 0),
  CONSTRAINT active_run_non_negative CHECK (active_run_days IS NULL OR active_run_days >= 0)
);

-- Performance index for user/month lookups
CREATE INDEX IF NOT EXISTS totals_user_month_idx ON run_totals(user_id, year_month);

-- Verification queries
DO $$
BEGIN
  RAISE NOTICE 'run_totals table created successfully';
  RAISE NOTICE 'Columns: user_id, year_month, total_days, longest_run_days, active_run_days, updated_at';
  RAISE NOTICE 'Constraints: Primary key (user_id, year_month), CHECK constraints for data validation';
  RAISE NOTICE 'Indexes: totals_user_month_idx for performance';
END $$;