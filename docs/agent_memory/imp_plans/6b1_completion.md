# Phase 6B-1 Completion Plan — Idempotent Core Operations

## Overview
Phase 6B-1 was marked ✅ COMPLETE in v2.md, but audit on 2025-09-12 revealed required SQL functions (`perform_run_extend`, `perform_run_merge`, `perform_run_split`) are missing. Partial JS-layer logic exists, but full idempotent operations with invariants are incomplete.

## Goal
Implement and validate the full set of idempotent run operations at the database layer, and integrate into runtime flow, to bring Phase 6B-1 to true completion.

---

## Sub-Phases

### Phase 6B-1a: Implement SQL Functions
- Create `perform_run_extend(user_id, local_date)`
- Create `perform_run_merge(user_id, local_date)`
- Create `perform_run_split(user_id, local_date)`
- Ensure each operation is idempotent (duplicate calls are no-ops)
- Map invariants: no overlaps, single active run, day_count consistency

**Exit Criteria:** All three functions exist and are callable directly in SQL.

---

### Phase 6B-1b: Wire into markDay()
- After `day_marks` insert/delete, call the appropriate run operation
- Extend → consecutive day  
- Merge → gap fill  
- Split → day removal  
- Wrap in try/catch to preserve mark success even if run update fails

**Exit Criteria:** Run operations execute automatically during day marking flow.

---

### Phase 6B-1c: Operation Validation
- Add SQL tests for each operation:
  - Extend → duplicate day is no-op
  - Merge → gap fill merges runs correctly
  - Split → day removal splits run properly
- Verify invariants:
  - No overlaps
  - Day_count accuracy
  - Only one active run per user

**Exit Criteria:** All tests pass with deterministic results.

---

### Phase 6B-1d: Documentation & Closure
- Update `imp_plans/v2.md` → mark 6B-1 ✅ COMPLETE
- Add Playbook: **Run Operation Validation Protocol**
- Add ADR if architectural decision changes (SQL vs JS implementation)

---

## Success Metrics
- Idempotent run operations function as specified
- No overlaps or invariant violations in test runs
- Totals and UI reflect correct runs after any marking/unmarking
- Phase 6B-1 can be formally closed with evidence

## Rollback Strategy
- If SQL functions cause instability → disable via feature flag `ff.potato.runs_v2`
- Revert to backfill-only rebuild for stability
