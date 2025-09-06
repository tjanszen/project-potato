-- Migration: Create runs table and all constraints
-- Phase 6A-4: Forward migration for runs table
-- Safe to run multiple times (idempotent)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create runs table (idempotent - only if not exists)
CREATE TABLE IF NOT EXISTS "runs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "span" daterange NOT NULL,
    "day_count" integer NOT NULL,
    "active" boolean NOT NULL DEFAULT false,
    "last_extended_at" timestamp DEFAULT NOW(),
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW(),
    "start_date" date GENERATED ALWAYS AS (lower("span")) STORED,
    "end_date" date GENERATED ALWAYS AS (upper("span") - interval '1 day') STORED
);

-- Add foreign key constraint (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'runs_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraints (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'day_count_check'
    ) THEN
        ALTER TABLE "runs" ADD CONSTRAINT "day_count_check" 
        CHECK ("day_count" = upper("span") - lower("span"));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'span_check'
    ) THEN
        ALTER TABLE "runs" ADD CONSTRAINT "span_check" 
        CHECK (upper("span") >= lower("span"));
    END IF;
END $$;

-- Add EXCLUDE constraint for non-overlapping spans (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'runs_user_id_span_excl'
    ) THEN
        ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_span_excl" 
        EXCLUDE USING gist ("user_id" WITH =, "span" WITH &&) 
        DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;

-- Add unique active constraint (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'unique_active_run'
    ) THEN
        CREATE UNIQUE INDEX "unique_active_run" ON "runs" ("user_id") 
        WHERE ("active" = true);
    END IF;
END $$;

-- Create performance indexes (idempotent)
CREATE INDEX IF NOT EXISTS "runs_user_end_date_idx" ON "runs" ("user_id", "end_date");
CREATE INDEX IF NOT EXISTS "runs_user_active_idx" ON "runs" ("user_id", "active");  
CREATE INDEX IF NOT EXISTS "runs_user_start_date_idx" ON "runs" ("user_id", "start_date");
CREATE INDEX IF NOT EXISTS "runs_span_overlap_idx" ON "runs" USING gist ("span");

-- Verify migration success
DO $$
BEGIN
    -- Check that table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'runs') THEN
        RAISE EXCEPTION 'Migration failed: runs table not created';
    END IF;
    
    -- Check that constraints exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'runs_user_id_span_excl') THEN
        RAISE EXCEPTION 'Migration failed: EXCLUDE constraint not created';
    END IF;
    
    -- Check that indexes exist  
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'unique_active_run') THEN
        RAISE EXCEPTION 'Migration failed: unique active index not created';
    END IF;
    
    RAISE NOTICE 'Migration 0001_create_runs_table.sql completed successfully';
END $$;