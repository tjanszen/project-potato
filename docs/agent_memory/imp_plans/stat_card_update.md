# Implementation Plan — Stat Cards Redesign (FF_POTATO_PROGRESS_HEADER_V2)

## Files and Components Identified
- **Primary Component:** `client/src/components/TotalsPanel.tsx` (lines 172–407)
- **Feature Flag:** `FF_POTATO_PROGRESS_HEADER_V2` (already exists and implemented)
- **Dependencies:** `lucide-react` installed for icon support

---

## Current Layout Analysis
- **Container:** CSS Grid with `gridTemplateColumns: 'repeat(3, 1fr)'`, `gap: '15px'`
- **Card Structure:** Vertical layout (Number → Label → "days" text)
- **Order:** ✅ Current Run → Longest Run → Total Days (matches requirements)

### Number + Label Rendering Locations
- Current Run: Lines 185–206 (`totalsData.current_run`)
- Longest Run: Lines 210–238 (`totalsData.longest_run`)
- Total Days: Lines 242–270 (`totalsData.total_days`)

---

## Proposed UI Changes (when FF_POTATO_PROGRESS_HEADER_V2=true)

### Current Structure
    [Number - 28px]
    [Label - 12px]
    [days - 10px]

### New Structure
    [Label - 12px]   ← Header at top
    [Number] [Icon]  ← Horizontal flex layout

### Icon Mappings
- **Current Run:** User (running person)
- **Longest Run:** Flame (flame icon)
- **Total Days:** Trophy (trophy icon)

---

## Feature Flag Integration Strategy
- Leverage existing `shouldRemoveHeader` branch (lines 172–273)
- Add card redesign within the existing conditional rendering path
- Preserve backward compatibility: `flag=false` → exact current UI

---

## 4-Phase Implementation Plan

### Phase 1: Icon Import & Setup
- Import `User`, `Flame`, and `Trophy` from `lucide-react`
- Test icon rendering without layout changes

### Phase 2: Card Layout Restructuring
- Move labels to top as headers
- Create horizontal flex layout for number + icon
- Remove `"days"` text completely
- Maintain existing colors and styling

### Phase 3: Testing & Validation
- Test `flag=false`: current UI unchanged
- Test `flag=true`: new card design rendered
- Validate responsive behavior across breakpoints

### Phase 4: Edge Case Testing
- Validate rendering for:
  - Zero values
  - Loading states
  - Error states
- Perform accessibility validation

---

## Risk Assessment
- ✅ **Low Risk:** Feature flag exists, icons are standard, changes isolated  
- ⚠️ **Medium Risk:** Layout change from vertical → horizontal alignment  
- 🛡️ **Mitigation:** Extensive testing in both flag states, preserve existing styling  

---

## Implementation Ready
All analysis complete. The feature flag infrastructure is already in place, and the redesign can be implemented safely within the existing conditional rendering branch under `FF_POTATO_PROGRESS_HEADER_V2`.
