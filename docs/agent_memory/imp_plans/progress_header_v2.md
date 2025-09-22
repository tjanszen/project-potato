# Codebase Structure Analysis - "Your Progress" Section

## Files and Components Identified
**Primary Component:**
- client/src/components/TotalsPanel.tsx – Contains all "Your Progress" UI elements
- client/src/pages/CalendarPage.tsx – Layout container that renders TotalsPanel

**Dependencies:**
- server/feature-flags.js – Feature flag management system
- API endpoint /api/feature-flags – For checking flag status

---

## Layout Description - How 3 Stat Boxes Are Grouped

**Container Structure:**

    // Outer container (lines 161-167)
    <div style={{ 
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px', 
      border: '1px solid #e9ecef',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>

      // Header (lines 168-175)
      <h3>📊 Your Progress</h3>

      // Stats grid (line 177)
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '15px' 
      }}>
        {/* 3 stat boxes */}
      </div>

      // Explanatory text (lines 275-288)
      <div>Updated automatically when you mark days</div>
    </div>

**Stat Box Grouping:**
- CSS Grid: gridTemplateColumns: 'repeat(3, 1fr)' → 3 equal columns
- Gap: 15px spacing between boxes
- Each stat has unique background color (green/yellow/blue)

---

## CSS/Spacing Details for Calendar Gap

**CalendarPage.tsx Layout:**

    // Lines 72-74: TotalsPanel wrapper
    <div style={{ marginBottom: '30px' }}>
      <TotalsPanel />
    </div>

    // Lines 76-81: Calendar immediately follows
    <CalendarGrid />

**Vertical Spacing Control:**
- 30px gap between TotalsPanel and Calendar (via marginBottom: '30px')
- Additional 20px internal padding within TotalsPanel container

---

## Code Changes Needed

1. Remove "Your Progress" Header:
   - Delete lines 168-175 in TotalsPanel.tsx (h3 element with emoji and text)

2. Remove Container Around 3 Stat Boxes:
   - Remove outer container div styling (lines 161-167) – padding, background, border, shadow
   - Keep only the grid container for the 3 stats

3. Remove Explanatory Text:
   - Delete lines 275-288 (border-top div with "Updated automatically..." text)

4. Reduce Vertical Spacing:
   - Change marginBottom: '30px' to marginBottom: '15px' in CalendarPage.tsx line 72
   - Or remove wrapper div entirely if no spacing needed

---

## Implementation Plan

### Phase 1: Feature Flag Setup
- Add 'ff.potato.progress_header_v2' to feature-flags.js (default: false)
- Add environment variable FF_POTATO_PROGRESS_HEADER_V2 support
- Create API endpoint access for frontend flag checking

### Phase 2: TotalsPanel Modifications
- Add useQuery hook to check ff.potato.progress_header_v2 flag status
- Wrap header h3 element in conditional rendering based on flag
- Wrap container div styling in conditional rendering based on flag
- Wrap explanatory text in conditional rendering based on flag
- When flag=true, render only the grid container with 3 stat boxes

### Phase 3: Layout Spacing Updates
- Modify CalendarPage.tsx wrapper div margin based on flag status
- When flag=true, reduce or eliminate spacing before calendar
- Test responsive behavior at different screen sizes

### Phase 4: Testing & Validation
- Verify flag=false maintains current appearance exactly
- Verify flag=true shows only 3 stat boxes with reduced spacing
- Test feature flag toggle functionality via admin endpoint
- Confirm no visual regressions in empty/loading/error states

---

## Gate
FF_POTATO_PROGRESS_HEADER_V2=off by default ensures gradual rollout control.
