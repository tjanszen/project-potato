# Totals v3.0

## 📋 Phase Structure Overview
Breaking down the Dynamic Current Run calculation into granular, safe sub-phases:

- **Phase A**: Feature-flagged development (A1, A2.1, A2.2, A2.3, A3)  
- **Phase B**: Logic transition and validation  
- **Phase C**: Cleanup and finalization  

---

## 🎯 Phase A1: Feature Flag Infrastructure
**Scope:**  
Add `FF_POTATO_TOTALS_V3` feature flag infrastructure without changing any calculation logic.

**Changes Required:**  
- Add environment variable checking capability  
- Add logging to show which logic path is being used  
- No changes to actual totals calculation yet  

**Verification Evidence:**  
- Server logs should show:  
    [Totals] Using V1 logic (flag disabled) for user <userId>
- API response remains unchanged  

**Pass/Fail Criteria:**  
- ✅ Logs show correct message  
- ✅ API response identical to pre-change behavior  
- ❌ Fail if server crashes, API errors, or no log message appears  

**Rollback Strategy:**  
- Remove environment variable checking code  
- Remove logging additions  

---

## 🎯 Phase A2.1: V3 Query Stub
**Scope:**  
Add a placeholder function for V3 logic that doesn’t execute queries yet, just logs that it would run.

**Changes Required:**  
- Create stub function `calculateRealTimeTotalsV3()`  
- Return hardcoded placeholder values (e.g., all zeros)  
- Add logging: `[Totals V3] Stub function called for user <userId>`  
- API still returns V1 results  

**Verification Evidence:**  
- Logs show both V1 and V3 stub messages  
- API response still returns V1 data  

**Pass/Fail Criteria:**  
- ✅ Logs show stub calls  
- ✅ API returns real V1 data  
- ❌ Fail if API returns placeholder data  

**Rollback Strategy:**  
- Remove V3 stub function + logging  

---

## 🎯 Phase A2.2: Implement V3 Query Logic
**Scope:**  
Replace V3 stub with actual `MAX(end_date)` query implementation, but continue returning V1 results.

**Changes Required:**  
- Implement refined Strategy 3 query in `calculateRealTimeTotalsV3()`  
- Log execution + timing  
- API response unchanged (still V1)  

**Verification Evidence:**  
- Logs show:  
    [Totals V3] Real-time calculation for user <userId>: <timing>ms
- Manual DB query confirms V3 values  
- API still returns V1  

**Pass/Fail Criteria:**  
- ✅ Logs show query execution + timing  
- ✅ Manual DB query matches logged V3 results  
- ❌ Fail if query errors or wrong results  

**Rollback Strategy:**  
- Revert V3 function to stub (A2.1)  

---

## 🎯 Phase A2.3: V1 vs V3 Comparison Logging
**Scope:**  
Add logging to compare V1 and V3 results, with warnings when they differ.

**Changes Required:**  
- Run both V1 and V3 queries  
- Log comparisons + differences  
- Add warnings if `current_run` values differ  
- API still returns V1 results  

**Verification Evidence:**  
- Logs show:  
    [Totals] Comparison: V1 current_run=2, V3 current_run=3 for user <userId>  
    [Totals] WARNING: V1/V3 current_run values differ for user <userId>
- No warnings when values match  
- API still returns V1  

**Pass/Fail Criteria:**  
- ✅ Logs show expected comparisons  
- ✅ Warnings only when values differ  
- ❌ Fail if API breaks or logging missing  

**Rollback Strategy:**  
- Remove comparison + warnings  
- Revert to A2.2  

---

## 🎯 Phase A3: Feature Flag Activation
**Scope:**  
Enable `FF_POTATO_TOTALS_V3=true` to return V3 results in API, keeping V1 as default.

**Changes Required:**  
- Add conditional logic for V3 return  
- Keep V1 as default  
- Maintain comparison logging from A2.3  

**Verification Evidence:**  
- With flag disabled:  
    [Totals] Returning V1 results (flag disabled) for user <userId>
- With flag enabled:  
    [Totals] Returning V3 results (flag enabled) for user <userId>  

**Pass/Fail Criteria:**  
- ✅ Flag toggle successfully changes API response between V1 and V3  
- ✅ Logs correctly indicate which results are returned  
- ✅ Default behavior (no flag) remains V1  
- ❌ Fail if flag doesn’t work or wrong logic activated  

**Rollback Strategy:**  
- Set `FF_POTATO_TOTALS_V3=false`  
- Or revert to A2.3 state  

---

## 🎯 Phase B1: Validation and Testing
**Scope:**  
Enable V3 logic in production-like testing to validate correctness across multiple users and scenarios.

**Changes Required:**  
- Set `FF_POTATO_TOTALS_V3=true` in environment  
- Monitor logs for errors or unexpected values  
- Test across multiple user patterns  

**Verification Evidence:**  
- Logs show:  
    [Totals] Returning V3 results (flag enabled) for user <userId>  
    [Totals] Comparison: V1 current_run=X, V3 current_run=Y for user <userId>

**Pass/Fail Criteria:**  
- ✅ V3 logic works for all test scenarios  
- ✅ No server errors or wrong values  
- ❌ Fail if API errors or user confusion  

**Rollback Strategy:**  
- Set `FF_POTATO_TOTALS_V3=false`  

---

## 🎯 Phase B2: Default Logic Switch
**Scope:**  
Make V3 the default while keeping an emergency rollback option.

**Changes Required:**  
- Default to V3 when no flag set  
- Add `TOTALS_V1_FALLBACK=true` for emergency V1  

**Verification Evidence:**  
- Without flag:  
    [Totals] Returning V3 results (default)
- With fallback:  
    [Totals] Returning V1 results (emergency fallback)  

**Pass/Fail Criteria:**  
- ✅ Default is V3  
- ✅ Fallback works to restore V1  
- ❌ Fail if default switch breaks functionality  

**Rollback Strategy:**  
- Use fallback flag  
- Revert code changes  

---

## 🎯 Phase C1: Code Cleanup
**Scope:**  
Remove temporary logging + simplify flag logic.

**Changes Required:**  
- Remove V1 vs V3 comparison logs  
- Simplify flag checks  
- Update comments  

**Verification Evidence:**  
- Logs simplified:  
    [Totals] Real-time calculation for user <userId>: <timing>ms  
- API still returns correct V3 results  

**Pass/Fail Criteria:**  
- ✅ API works with V3  
- ✅ Logs are clean  
- ❌ Fail if cleanup breaks behavior  

**Rollback Strategy:**  
- Restore comparison logging  

---

## 🎯 Phase C2: Final Flag Removal
**Scope:**  
Remove feature flag infrastructure completely, making V3 permanent.

**Changes Required:**  
- Remove all flag checks  
- Finalize code as single path  

**Verification Evidence:**  
- No references to feature flag remain  
- API continues returning correct results  

**Pass/Fail Criteria:**  
- ✅ Clean, permanent V3 implementation  
- ❌ Fail if code cleanup introduces bugs  

**Rollback Strategy:**  
- Git revert to previous phase  

---

## 🚀 Implementation Sequence Summary
- A1: Add flag infrastructure (log-only)  
- A2.1: Add V3 query stub (placeholder function)  
- A2.2: Implement V3 MAX(end_date) query logic  
- A2.3: Add V1 vs V3 comparison logging with warnings  
- A3: Flag-controlled API switching  
- B1: Production testing with V3 enabled  
- B2: Switch V3 to default behavior  
- C1: Clean up comparison artifacts  
- C2: Remove flag infrastructure entirely  

Each sub-phase builds incrementally with clear verification points and rollback options.

## 📑 Appendix: Live System "Current Run" Verification

### ✅ Verification Details for User `runs@me.com`
**User ID:** `5b966240-5564-4347-b576-b5d77c0045ef`  

---

### 🗃️ Raw SQL Query Results from Runs Table

    run_id                                  start_date   end_date                 day_count  active
    e6a51ea1-5144-4b1a-b9c0-a53357dedce5    2025-09-07   2025-09-08 00:00:00      2          t
    f61a0614-d6db-4696-8b83-fbeae74fd094    2025-09-16   2025-09-18 00:00:00      3          f

---

### 📊 Raw JSON Response from Totals API

    {
      "total_days": 5,
      "longest_run": 3,
      "current_run": 2
    }

---

### 🔍 Evidence-Based Analysis

**How the Values Map:**
- ✅ `current_run = 2`  
  - Source: Run with `active = true` has `day_count = 2`  
  - Active Run: Sept 7–8 (2 days, active = t)  
  - Logic: `current_run` = day_count of the single run where `active = true`

- ✅ `longest_run = 3`  
  - Source: Maximum `day_count` across all runs = 3  
  - Longest Run: Sept 16–18 (3 days)  
  - Logic: `longest_run` = MAX(day_count) from all runs

- ✅ `total_days = 5`  
  - Source: Sum of all `day_count` values = 2 + 3 = 5  
  - Logic: `total_days` = SUM(day_count) from all runs  

---

### 🤔 Key Finding: Active Status vs. Recency

**Surprising Evidence:**
- The older run (Sept 7–8) has `active = true`  
- The more recent run (Sept 16–18) has `active = false`  
- This proves: the live system’s `current_run` is determined by **which run has `active = true` in the database**, not necessarily the most recent run or the run ending on today’s date.  

---

### 📋 Plain-Language Explanation

Based on this live evidence:  
- `current_run = 2` because there is exactly one run with `active = true` (the Sept 7–8 run with 2 days).  
- The system does **not** automatically use the most recent run — even though Sept 16–18 is more recent (3 days), it has `active = false` so it does not count as the current run.  
- The **active flag is the definitive controller**: whichever run has `active = true` determines `current_run`, regardless of dates.  

This live system evidence shows that:  
**Current Run = day_count of whichever run has active = true, independent of recency.**
