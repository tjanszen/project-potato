# Implementation Plan: Dashboard Layout Simplification

## Objective
Streamline the logged-in dashboard by removing the text header, repositioning elements, and introducing a footer. This keeps the potato emoji for branding, prioritizes progress stats, and relocates user controls for a cleaner UX.

---

## Phase 1: Remove Header, Keep Potato Emoji
**Goal:** Eliminate the header container with “Potato No Drink Tracker” text, while keeping the 🥔 emoji as a standalone element at the very top.  
- File: `client/src/pages/CalendarPage.tsx`
- Action:
  - Delete the entire `<header>` block.
  - Add a single element `<div>🥔</div>` above `TotalsPanel`.
- Expected Layout:
  - 🥔 emoji at top left.
  - TotalsPanel now appears immediately under 🥔.
- Complexity: ⭐ Low

---

## Phase 2: Introduce Footer
**Goal:** Create a new footer section that flows naturally below the calendar.  
- File: `client/src/pages/CalendarPage.tsx`
- Action:
  - Add `<footer>` after `<CalendarGrid>`.
  - Use a flex container for layout.
  - No sticky behavior — footer sits directly under calendar.
- Expected Layout:
  - Footer spans page width.
  - Space reserved for controls (UserInfo + Dev Tools).
- Complexity: ⭐⭐ Medium

---

## Phase 3: Relocate UserInfo and Dev Tools
**Goal:** Move both controls into the new footer, aligned side by side.  
- Files:
  - `client/src/pages/CalendarPage.tsx` (main changes)
  - `client/src/components/UserInfo.tsx` (no changes needed, reused as-is)
- Action:
  - Remove `<UserInfo />` and Dev Tools `<Link>` from header (already deleted in Phase 1).
  - Insert both into the new footer inside a flexbox container:
    - `<UserInfo />` left-aligned
    - `<Link href="/dev">Dev Tools</Link>` right-aligned
- Expected Layout:
  - Clean header with just 🥔.
  - TotalsPanel directly beneath.
  - Calendar in center.
  - Footer with user info + dev tools at bottom, side by side.
- Complexity: ⭐ Low

---

## Expected Final Flow
- 🥔 emoji at top left (standalone, no header text).
- “Your Progress” stats (TotalsPanel) directly below.
- Calendar remains in main content area.
- Drawer behavior unchanged.
- Footer below calendar:
  - Left: UserInfo (email, sign out, timezone).
  - Right: Dev Tools link.

---

## Risks & Mitigations
- **Risk:** Removing the header could break layout spacing.  
  **Mitigation:** Verify flex container removal doesn’t collapse margins; adjust with simple inline style if needed.
- **Risk:** Footer spacing may feel cramped on small screens.  
  **Mitigation:** Acceptable for now; mobile responsiveness out of scope for this pass.
