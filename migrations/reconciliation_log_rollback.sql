-- Phase 7A-2: Rollback migration for reconciliation_log table
-- Removes reconciliation_log table and related objects

-- Drop indexes first
DROP INDEX IF EXISTS recon_correlation_idx;
DROP INDEX IF EXISTS recon_created_at_idx;
DROP INDEX IF EXISTS recon_status_idx;
DROP INDEX IF EXISTS recon_user_month_idx;

-- Drop table
DROP TABLE IF EXISTS reconciliation_log;

-- Remove migration record
DELETE FROM schema_migrations WHERE filename = 'reconciliation_log_forward.sql';