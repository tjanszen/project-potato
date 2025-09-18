# Totals v2

## 📋 Phase Structure Overview
Breaking down the Dynamic Current Run calculation into granular, safe sub-phases:

- **Phase A**: Feature-flagged development (A1, A2.1, A2.2, A2.3, A3)  
- **Phase B**: Logic transition and validation  
- **Phase C**: Cleanup and finalization  

---

## 🎯 Phase A1: Feature Flag Infrastructure
**Scope:**  
Add `TOTALS_V2_ENABLED` feature flag infrastructure without changing any calculation logic.

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

## 🎯 Phase A2.1: V2 Query Stub
**Scope:**  
Add a placeholder function for V2 logic that doesn’t execute queries yet, just logs that it would run.

**Changes Required:**  
- Create stub function `calculateRealTimeTotalsV2()`  
- Return hardcoded placeholder values (e.g., all zeros)  
- Add logging: `[Totals V2] Stub function called for user <userId>`  
- API still returns V1 results  

**Verification Evidence:**  
- Logs show both V1 and V2 stub messages  
- API response still returns V1 data  

**Pass/Fail Criteria:**  
- ✅ Logs show stub calls  
- ✅ API returns real V1 data  
- ❌ Fail if API returns placeholder data  

**Rollback Strategy:**  
- Remove V2 stub function + logging  

---

## 🎯 Phase A2.2: Implement V2 Query Logic
**Scope:**  
Replace V2 stub with actual `MAX(end_date)` query implementation, but continue returning V1 results.

**Changes Required:**  
- Implement refined Strategy 2 query in `calculateRealTimeTotalsV2()`  
- Log execution + timing  
- API response unchanged (still V1)  

**Verification Evidence:**  
- Logs show:  
    [Totals V2] Real-time calculation for user <userId>: <timing>ms
- Manual DB query confirms V2 values  
- API still returns V1  

**Pass/Fail Criteria:**  
- ✅ Logs show query execution + timing  
- ✅ Manual DB query matches logged V2 results  
- ❌ Fail if query errors or wrong results  

**Rollback Strategy:**  
- Revert V2 function to stub (A2.1)  

---

## 🎯 Phase A2.3: V1 vs V2 Comparison Logging
**Scope:**  
Add logging to compare V1 and V2 results, with warnings when they differ.

**Changes Required:**  
- Run both V1 and V2 queries  
- Log comparisons + differences  
- Add warnings if `current_run` values differ  
- API still returns V1 results  

**Verification Evidence:**  
- Logs show:  
    [Totals] Comparison: V1 current_run=2, V2 current_run=3 for user <userId>  
    [Totals] WARNING: V1/V2 current_run values differ for user <userId>
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
Enable `TOTALS_V2_ENABLED=true` to return V2 results in API, keeping V1 as default.

**Changes Required:**  
- Add conditional logic for V2 return  
- Keep V1 as default  
- Maintain comparison logging from A2.3  

**Verification Evidence:**  
- With flag disabled:  
    [Totals] Returning V1 results (flag disabled) for user <userId>
- With flag enabled:  
    [Totals] Returning V2 results (flag enabled) for user <userId>  

**Pass/Fail Criteria:**  
- ✅ Flag toggle successfully changes API response between V1 and V2  
- ✅ Logs correctly indicate which results are returned  
- ✅ Default behavior (no flag) remains V1  
- ❌ Fail if flag doesn’t work or wrong logic activated  

**Rollback Strategy:**  
- Set `TOTALS_V2_ENABLED=false`  
- Or revert to A2.3 state  

---

## 🎯 Phase B1: Validation and Testing
**Scope:**  
Enable V2 logic in production-like testing to validate correctness across multiple users and scenarios.

**Changes Required:**  
- Set `TOTALS_V2_ENABLED=true` in environment  
- Monitor logs for errors or unexpected values  
- Test across multiple user patterns  

**Verification Evidence:**  
- Logs show:  
    [Totals] Returning V2 results (flag enabled) for user <userId>  
    [Totals] Comparison: V1 current_run=X, V2 current_run=Y for user <userId>

**Pass/Fail Criteria:**  
- ✅ V2 logic works for all test scenarios  
- ✅ No server errors or wrong values  
- ❌ Fail if API errors or user confusion  

**Rollback Strategy:**  
- Set `TOTALS_V2_ENABLED=false`  

---

## 🎯 Phase B2: Default Logic Switch
**Scope:**  
Make V2 the default while keeping an emergency rollback option.

**Changes Required:**  
- Default to V2 when no flag set  
- Add `TOTALS_V1_FALLBACK=true` for emergency V1  

**Verification Evidence:**  
- Without flag:  
    [Totals] Returning V2 results (default)
- With fallback:  
    [Totals] Returning V1 results (emergency fallback)  

**Pass/Fail Criteria:**  
- ✅ Default is V2  
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
- Remove V1 vs V2 comparison logs  
- Simplify flag checks  
- Update comments  

**Verification Evidence:**  
- Logs simplified:  
    [Totals] Real-time calculation for user <userId>: <timing>ms  
- API still returns correct V2 results  

**Pass/Fail Criteria:**  
- ✅ API works with V2  
- ✅ Logs are clean  
- ❌ Fail if cleanup breaks behavior  

**Rollback Strategy:**  
- Restore comparison logging  

---

## 🎯 Phase C2: Final Flag Removal
**Scope:**  
Remove feature flag infrastructure completely, making V2 permanent.

**Changes Required:**  
- Remove all flag checks  
- Finalize code as single path  

**Verification Evidence:**  
- No references to feature flag remain  
- API continues returning correct results  

**Pass/Fail Criteria:**  
- ✅ Clean, permanent V2 implementation  
- ❌ Fail if code cleanup introduces bugs  

**Rollback Strategy:**  
- Git revert to previous phase  

---

## 🚀 Implementation Sequence Summary
- A1: Add flag infrastructure (log-only)  
- A2.1: Add V2 query stub (placeholder function)  
- A2.2: Implement V2 MAX(end_date) query logic  
- A2.3: Add V1 vs V2 comparison logging with warnings  
- A3: Flag-controlled API switching  
- B1: Production testing with V2 enabled  
- B2: Switch V2 to default behavior  
- C1: Clean up comparison artifacts  
- C2: Remove flag infrastructure entirely  

Each sub-phase builds incrementally with clear verification points and rollback options.
