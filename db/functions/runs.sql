-- SQL Functions for Run Operations (Phase 6B-1)
-- These functions provide idempotent core operations for managing consecutive day runs
-- All functions are designed to be safe for repeated execution

-- Function: perform_run_extend
-- Purpose: Extends or creates runs when a new day is marked
-- Parameters: user_id (UUID), local_date (DATE)
-- Returns: VOID
-- Behavior:
--   1. If local_date already marked in day_marks → no-op (idempotent)
--   2. If local_date extends an existing run (day after run end_date) → update run span and increment day_count
--   3. If no run exists to extend → insert a new run starting/ending on local_date
--
-- Usage: SELECT perform_run_extend('user-uuid', '2025-09-10');

CREATE OR REPLACE FUNCTION perform_run_extend(
    p_user_id UUID,
    p_local_date DATE
) RETURNS VOID AS $$
DECLARE
    v_existing_run RECORD;
    v_extending_run RECORD;
    v_new_span TEXT;
    v_new_day_count INTEGER;
BEGIN
    -- Check if this date is already covered by an existing run (idempotent guard)
    SELECT id, span, day_count, active
    INTO v_existing_run
    FROM runs 
    WHERE user_id = p_user_id 
      AND span @> p_local_date  -- daterange contains operator
    LIMIT 1;
    
    -- If date is already covered by a run, this is a no-op
    IF FOUND THEN
        RETURN;
    END IF;
    
    -- Look for a run that this date would extend (right-adjacent: day after run end)
    SELECT id, span, day_count
    INTO v_extending_run
    FROM runs 
    WHERE user_id = p_user_id 
      AND upper(span) = p_local_date  -- upper() is exclusive, so this checks if p_local_date is the day after the run
    ORDER BY upper(span) DESC
    LIMIT 1;
    
    IF FOUND THEN
        -- Extend the existing run forward (right-adjacent)
        v_new_span := '[' || lower(v_extending_run.span) || ',' || (p_local_date + INTERVAL '1 day')::DATE || ')';
        v_new_day_count := v_extending_run.day_count + 1;
        
        UPDATE runs 
        SET span = v_new_span::daterange,
            day_count = v_new_day_count,
            last_extended_at = NOW(),
            updated_at = NOW()
        WHERE id = v_extending_run.id;
        
        -- Mark this run as active (it was just extended)
        UPDATE runs SET active = false WHERE user_id = p_user_id;
        UPDATE runs SET active = true WHERE id = v_extending_run.id;
    ELSE
        -- Look for a run that this date would extend backward (left-adjacent: day before run start)
        SELECT id, span, day_count
        INTO v_extending_run
        FROM runs 
        WHERE user_id = p_user_id 
          AND lower(span) = (p_local_date + INTERVAL '1 day')::DATE  -- Check if p_local_date is the day before the run starts
        ORDER BY lower(span) ASC
        LIMIT 1;
        
        IF FOUND THEN
            -- Extend the existing run backward (left-adjacent)
            v_new_span := '[' || p_local_date || ',' || upper(v_extending_run.span) || ')';
            v_new_day_count := v_extending_run.day_count + 1;
            
            UPDATE runs 
            SET span = v_new_span::daterange,
                day_count = v_new_day_count,
                last_extended_at = NOW(),
                updated_at = NOW()
            WHERE id = v_extending_run.id;
            
            -- Mark this run as active (it was just extended)
            UPDATE runs SET active = false WHERE user_id = p_user_id;
            UPDATE runs SET active = true WHERE id = v_extending_run.id;
    ELSE
        -- No existing run to extend, create a new run
        -- Deactivate any existing active run first
        UPDATE runs SET active = false WHERE user_id = p_user_id AND active = true;
        
        -- Create new run spanning just this one day
        -- daterange is [inclusive, exclusive), so for a single day we use [date, date+1)
        v_new_span := '[' || p_local_date || ',' || (p_local_date + INTERVAL '1 day')::DATE || ')';
        
        INSERT INTO runs (user_id, span, day_count, active, last_extended_at, created_at, updated_at)
        VALUES (
            p_user_id,
            v_new_span::daterange,
            1,  -- Single day
            true,  -- New run starts active
            NOW(),
            NOW(),
            NOW()
        );
    END IF;
    
END;
$$ LANGUAGE plpgsql;

-- Function: perform_run_merge
-- Purpose: Merges two adjacent or overlapping runs (placeholder for Phase 6B-1a)
-- Note: Implementation deferred to next sub-phase
CREATE OR REPLACE FUNCTION perform_run_merge(
    p_user_id UUID,
    p_run1_id UUID,
    p_run2_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Placeholder implementation
    RAISE NOTICE 'perform_run_merge not yet implemented (Phase 6B-1a scope)';
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function: perform_run_split
-- Purpose: Splits a run at a specified date (placeholder for Phase 6B-1a)
-- Note: Implementation deferred to next sub-phase
CREATE OR REPLACE FUNCTION perform_run_split(
    p_user_id UUID,
    p_run_id UUID,
    p_split_date DATE
) RETURNS VOID AS $$
BEGIN
    -- Placeholder implementation
    RAISE NOTICE 'perform_run_split not yet implemented (Phase 6B-1a scope)';
    RETURN;
END;
$$ LANGUAGE plpgsql;