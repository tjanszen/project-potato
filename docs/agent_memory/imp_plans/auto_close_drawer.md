# Implementation Plan: auto_close_drawer

## Goal
Update the "Mark as No Drink" UX flow so that:
- The drawer automatically closes after a successful mark
- The calendar day updates (green highlight) remains intact
- Success toast notification is removed
- Error toasts remain unchanged

---

## Phase 1: Baseline Verification
**Objective:** Confirm current flow before making changes.
- Add temporary console logs in `executeMarkNoDrink()` inside `DayDrawer.tsx` to trace sequence:
  - Before API call
  - On success (toast + onDayMarked trigger)
  - On error (toast shown)
- Capture screenshots of:
  - Success toast overlapping drawer
  - Drawer remaining open after success

✅ Deliverable: Confirmed current sequence (toast → onDayMarked → drawer open).

**Prompt**
Goal: Confirm baseline behavior of "Mark as No Drink" flow before implementing UX changes.

Do:
- Open `client/src/components/DayDrawer.tsx`
- In `executeMarkNoDrink()`:
  - Add `console.log("[MarkNoDrink] Before API call", selectedDate);` before the API request
  - Add `console.log("[MarkNoDrink] Success - updating calendar & showing toast");` inside the success block (just before the toast + `onDayMarked?.()`)
  - Add `console.log("[MarkNoDrink] Error - showing error toast", error);` inside the error block
- Save and rebuild frontend
- Run through the flow: select a day → click "Mark as No Drink"
- Capture screenshots showing:
  - Success toast overlapping drawer
  - Drawer remains open after success
- Verify logs in browser DevTools console to confirm sequence

Proof:
- Console logs must include:
  - `[MarkNoDrink] Before API call`
  - `[MarkNoDrink] Success - updating calendar & showing toast`
  - `[MarkNoDrink] Error - showing error toast`
- Screenshots show both toast + drawer remaining open on success

Error Handling:
- If `executeMarkNoDrink()` not found or file missing:
  → STOP
  → Summarize findings (file not located, function missing, or renamed)
  → WAIT for operator approval before resuming


---

## Phase 2: Remove Success Toast
**Objective:** Eliminate only the success toast, keep error handling intact.
- Modify `DayDrawer.tsx`:
  - Comment out or remove `showSuccess(...)` call in the success block.
  - Leave error toast logic unchanged.
- Test by marking a day:
  - Calendar updates (green dot)
  - Drawer remains open
  - No success toast displayed

✅ Deliverable: Success toast removed, error toasts still function.

---

## Phase 3: Auto-Close Drawer
**Objective:** Add drawer auto-close on success.
- Modify `DayDrawer.tsx` success block:
  - After `onDayMarked?.()` call, invoke `onClose()`.
- Test by marking a day:
  - Calendar updates
  - Drawer closes automatically
  - No toast displayed

✅ Deliverable: Drawer auto-closes on success, calendar refresh intact.

---

## Phase 4: Integration Validation
**Objective:** Ensure full user flow works as intended.
- Test sequence:
  - Click calendar day → Drawer opens
  - Click "Mark as No Drink" → API runs
  - Success → Calendar updates + Drawer closes, no toast
  - Error → Drawer stays open, error toast displayed
- Verify optimistic update still provides immediate green highlight.

✅ Deliverable: UX matches expected behavior with no regressions.

---

## Phase 5: Cleanup & Documentation
**Objective:** Ensure maintainability.
- Remove unused `showSuccess` import if no longer needed.
- Add inline comment in `DayDrawer.tsx`:
  ```ts
  // Success case: close drawer and update calendar without showing toast
