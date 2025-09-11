# Runs Calculation Wiring Fix Implementation Plan
> 2025-09-11 — Fix broken wiring between day marking and runs calculation

## Overview

**Problem:** Runs table remains empty despite day_marks data existing because runs calculation logic exists in `server/storage.ts` but runtime imports `server/storage.js`. Phase 6B-1 (Idempotent Core Operations) was never completed, leaving day marking flow disconnected from runs calculation.

**Solution:** Port runs calculation logic from storage.ts to storage.js and wire into markDay() flow using incremental phased approach.

**Impact:** Fixes blocking issue for Phase 7C-1 dashboard by enabling `/api/v2/totals` to return actual user statistics instead of zeros.

---

## Phase A: Wire performRunExtend into markDay

### Goal
Connect day marking flow to runs calculation by implementing basic run extension logic in storage.js and integrating into markDay() with safe error handling.

### Tasks
- Port `performRunExtend` method from storage.ts to storage.js
- Integrate runs calculation into `markDay()` method with try/catch wrapper
- Implement idempotent behavior: duplicate day marking = no-op
- Add logging for runs calculation operations
- Ensure day marking succeeds even if runs calculation fails

### Exit Criteria
- Day marking creates entries in both `day_marks` AND `runs` tables
- Consecutive day marking extends existing runs correctly
- Duplicate day marking is idempotent (no duplicate runs created)
- Day marking API response time remains < 500ms
- Error in runs calculation doesn't break day marking flow

### Evidence to Collect
```sql
-- Verify runs are created when marking days
SELECT COUNT(*) FROM runs WHERE user_id = 'test-user';
-- Should be > 0 after marking days

-- Test consecutive day marking
INSERT INTO day_marks VALUES ('test-user', '2025-09-10', true);
-- Then mark 2025-09-11, should extend run not create new one
SELECT * FROM runs WHERE user_id = 'test-user' ORDER BY start_date;
```

### Rollback Plan
Comment out runs calculation call in `markDay()` method to revert to day_marks-only behavior.

**Error Handling:** This phase follows the Error Handling Clause.

---

## Phase B: Add merge logic for gap filling

### Goal
Implement run merge operations to handle gap-filling scenarios where marking a day between two existing runs should merge them into one continuous run.

### Tasks
- Port `performRunMerge` method from storage.ts to storage.js
- Implement gap detection logic in runs calculation flow
- Add merge operation when day marking fills gap between runs
- Ensure proper run consolidation (delete old runs, create merged run)
- Maintain day count accuracy: `end_date - start_date + 1`

### Exit Criteria
- Marking day between two runs merges them into single run
- Day count in merged run equals sum of original runs + gap day
- No overlapping runs exist for any user
- Merge operation is idempotent (re-marking gap day = no-op)
- Database constraints prevent invalid run overlaps

### Evidence to Collect
```sql
-- Create gap scenario
INSERT INTO day_marks VALUES ('test-user', '2025-09-01', true);  -- Run 1
INSERT INTO day_marks VALUES ('test-user', '2025-09-03', true);  -- Run 2
-- Mark gap day
INSERT INTO day_marks VALUES ('test-user', '2025-09-02', true);  -- Should merge
SELECT COUNT(*) FROM runs WHERE user_id = 'test-user';  -- Should be 1
SELECT day_count FROM runs WHERE user_id = 'test-user';  -- Should be 3
```

### Rollback Plan
Remove merge logic call from runs calculation flow, revert to extend-only behavior.

**Error Handling:** This phase follows the Error Handling Clause.

---

## Phase C: Backfill runs for existing day_marks

### Goal
Process all existing user day_marks data to populate runs table, ensuring no historical data is lost and all users get proper runs/totals statistics.

### Tasks
- Port `rebuildUserRuns` method from storage.ts to storage.js
- Create administrative backfill function for all users
- Process existing day_marks chronologically to build runs
- Validate backfilled data against expected patterns
- Ensure backfill is safe to run multiple times (idempotent)

### Exit Criteria
- All users with day_marks have corresponding runs entries
- Total day count across all runs equals day_marks count per user
- No gaps or overlaps in backfilled runs
- `/api/v2/totals` returns accurate historical statistics
- Backfill operation completes without errors

### Evidence to Collect
```sql
-- Verify data consistency after backfill
SELECT 
  dm.user_id,
  COUNT(dm.local_date) as marked_days,
  COALESCE(SUM(r.day_count), 0) as run_days
FROM day_marks dm 
LEFT JOIN runs r ON dm.user_id = r.user_id
GROUP BY dm.user_id;
-- marked_days should equal run_days for all users

-- Check for gaps or overlaps
SELECT COUNT(*) FROM runs a JOIN runs b 
  ON a.user_id = b.user_id AND a.id != b.id 
  AND a.span && b.span;
-- Should return 0 (no overlaps)
```

### Rollback Plan
Delete all runs entries and revert to empty runs table state. Day_marks remain unchanged.

**Error Handling:** This phase follows the Error Handling Clause.

---

## Phase D: Complete Phase 6B-1 operations

### Goal
Implement remaining operations from Phase 6B-1 specification: run split/remove-day functionality to complete the idempotent core operations suite.

### Tasks
- Implement `performRunSplit` for removing days from middle of runs
- Add day removal logic to handle unmarking scenarios (future feature)
- Complete validation checkpoints for all run operations
- Document operation invariants and edge cases
- Mark Phase 6B-1 as ✅ COMPLETE in v2.md

### Exit Criteria
- Run split operation correctly handles start/middle/end day removal
- All operations maintain data invariants (no overlaps, single active run)
- Operation validation confirms day count accuracy and date continuity
- Phase 6B-1 marked complete with evidence collected
- All idempotent operations handle duplicate calls as no-ops

### Evidence to Collect
```sql
-- Test run split operation
INSERT INTO day_marks VALUES ('test-user', '2025-09-05', true);
INSERT INTO day_marks VALUES ('test-user', '2025-09-06', true);
INSERT INTO day_marks VALUES ('test-user', '2025-09-07', true);
-- Remove middle day
DELETE FROM day_marks WHERE user_id = 'test-user' AND local_date = '2025-09-06';
-- Should create two separate runs
SELECT COUNT(*) FROM runs WHERE user_id = 'test-user';  -- Should be 2
```

### Rollback Plan
Remove split operation from runs calculation, maintain extend/merge functionality only.

**Error Handling:** This phase follows the Error Handling Clause.

---

## Implementation Order

1. **Phase A** → Basic wiring and extend operations (unblocks Phase 7C-1)
2. **Phase B** → Merge logic for gap filling (completes core functionality)  
3. **Phase C** → Backfill existing data (enables full user statistics)
4. **Phase D** → Split operations (completes Phase 6B-1 specification)

## Success Metrics

- ✅ Dashboard shows actual user statistics instead of empty state
- ✅ `/api/v2/totals` returns non-zero values for users with day_marks
- ✅ No performance degradation in day marking operations
- ✅ All existing day_marks converted to proper runs data
- ✅ Phase 6B-1 marked complete in v2.md implementation plan

## Rollback Strategy

Each phase includes individual rollback plans. Global rollback: comment out all runs calculation calls in `markDay()` and clear runs table, reverting to day_marks-only behavior.