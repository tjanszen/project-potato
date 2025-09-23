# Implementation Plan — Leagues Page Placeholder (FF_POTATO_LEAGUES_PLACEHOLDER)

## Overview
We are introducing a new Leagues page with scrollable placeholder league cards.  
The feature will be gated behind a new feature flag: **FF_POTATO_LEAGUES_PLACEHOLDER**.  
This ensures gradual rollout and prevents unauthenticated or premature exposure.

---

## Feature Flag
- Name: `ff.potato.leagues_placeholder`
- Env Var: `FF_POTATO_LEAGUES_PLACEHOLDER`
- Default: false
- Description: "Enables Leagues page with placeholder cards for testing"

---

## File Structure
Recommended file additions:
- `client/src/pages/LeaguesPage.tsx` → Main page container
- `client/src/components/LeagueCard.tsx` (Phase 2) → Individual card component (refactor target)
- `client/src/components/LeagueCard.css` → Optional styling for responsive scroll layout

Follows existing patterns:
- `CalendarPage.tsx` under `pages/`
- `TotalsPanel.tsx` under `components/`

---

## Phased Plan

### Phase 1: Feature Flag Setup
**Scope**
- Add `ff.potato.leagues_placeholder` to `server/feature-flags.js`
- Add env var `FF_POTATO_LEAGUES_PLACEHOLDER` support
- Expose via `/api/feature-flags`
- Integrate flag into frontend with React Query (`apiClient.getFeatureFlag`)

**Validation**
- Flag=false → no route, no UI changes
- Flag=true → placeholder route mount allowed

---

### Phase 2: Create LeaguesPage (Hardcoded Cards Inline)
**Scope**
- Add `/leagues` route to `AppRoutes.tsx` under `<AuthGuard>`
- Inside `LeaguesPage.tsx`:
  - Hardcode 6 league cards inline (no separate component yet)
  - Each card structure:
    - Top image placeholder (gray block)
    - Top-right tag (e.g., Beginner/Intermediate/Advanced)
    - Header (league name)
    - Subtext (short description)
    - Bottom-left: Users icon + “55”
    - Bottom-right: LineChart icon + “Trending”
  - Apply layout styles:
    - Container: scrollable column with `overflow-y: auto`, bottom padding to account for BottomNav
    - Cards: flex column, rounded corners, shadow, white background
  - Add accessibility:
    - Container: `role="list"`
    - Cards: `role="listitem"`, `cursor: default`

**Validation**
- Flag=false → route hidden
- Flag=true → `/leagues` shows 6 placeholder cards
- Cards scrollable on mobile viewport

---

### Phase 3: Refactor into LeagueCard Component
**Scope**
- Extract inline card markup into `LeagueCard.tsx`
- Accept props: `tag`, `title`, `description`, `users`, `trending`
- Replace hardcoded markup in `LeaguesPage.tsx` with mapped array of objects
- Keep placeholders for now (e.g., same image, dummy values)

**Validation**
- Cards still render identically as Phase 2
- Refactor reduces duplication, maintains flexibility

---

### Phase 4: Responsive Layout & Scroll Polish
**Scope**
- Add responsive CSS:
  - Mobile ≤480px: 1 card per row
  - Tablet 481–768px: 2 cards per row
  - Desktop >768px: 3+ cards per row
- Ensure proper bottom padding for BottomNav (reuse existing CSS var from bottom nav)
- Test smooth scrolling + touch interactions

**Validation**
- Cards adjust grid layout across viewport sizes
- No overlap with BottomNav
- Scrollable behavior confirmed on mobile

---

### Phase 5: Validation & Documentation
**Scope**
- Test end-to-end:
  - `/auth` → BottomNav hidden
  - `/` unauthenticated → BottomNav hidden
  - `/leagues` authenticated + flag=true → LeaguesPage visible with scrollable cards
  - `/leagues` flag=false → route hidden
- Accessibility testing (screen reader, keyboard nav)
- Update docs:
  - `docs/agent_memory/imp_plans/leagues_cards.md` with final implementation details
  - Add ADR entry in `docs/agent_memory/decisions.adrs.md` for new feature flag

---

## Risks & Mitigation
- **Risk:** Route conflicts with existing pages  
  **Mitigation:** Follow `CalendarPage.tsx` pattern under `<AuthGuard>`
- **Risk:** Mobile overflow with BottomNav  
  **Mitigation:** Use shared bottom padding CSS variable from `BottomNav`
- **Risk:** Over-engineering early  
  **Mitigation:** Keep Phase 2 inline → refactor only in Phase 3

---

## Status & Readiness
- Icons confirmed available: `Users`, `LineChart` (lucide-react)
- File structure consistent with existing pages/components
- Layout approach defined (flex column container + scrollable + grid responsiveness)
- Phased rollout via FF_POTATO_LEAGUES_PLACEHOLDER ensures safe testing