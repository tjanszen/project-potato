# League Details Page - Phased Implementation Plan

This plan extends the current League system by introducing a **League Details page**. The page allows users to click on leagues from the Active tab to view details, see a list of active members, and mark completion.  

No code has been written yet — this is a **planning deliverable only**.

---

## Current Implementation Review

### Frontend
- ✅ `LeaguesPage` with tabbed interface (Active, List, Clubs)  
- ✅ `LeagueCard` component with join/leave/complete CTAs  
- ✅ Routing via `wouter` (`AppRoutes.tsx`)  
- ✅ Feature flags:  
  - `ff.potato.leagues.active` (completion)  
  - `ff.potato.leagues_csv` (data loading)  
- ❌ No `LeagueDetailsPage` route or component  

### Backend
- ✅ League membership service: `joinLeague()`, `leaveLeague()`, `markCompleted()`, `getUserMembership()`, `countActiveMembers()`  
- ✅ API endpoints for join/leave/complete operations  
- ❌ Gap: No API endpoint to fetch **all active members** of a league  

### Database Schema
- ✅ `league_memberships` table with proper constraints  
- ✅ `users` table with `email` field  
- ✅ Schema supports tracking active members (`is_active = true`)  
- ✅ `completed_at` field available for completion state  
- ❌ No schema changes needed  

---

## Phased Implementation Plan

### Phase 1: Backend - Member List API
**Goal:** Add API endpoint to fetch all active members of a league.  

**Scope:**  
- Add `getActiveMembers(leagueId)` function to `server/league-membership.js`:
    - Query `league_memberships` where `league_id = ?` and `is_active = true`
    - JOIN with `users` table for emails
    - Return array of `{ email }` (keep payload minimal for MVP)
- Add `GET /api/leagues/:id/members` endpoint in `index.js`:
    - Gate behind `ff.potato.leagues.details` feature flag
    - Require authentication
    - Return JSON: `{ members: [...], count: N }`
- Add feature flag to `server/feature-flags.js`:
    - Env var: `FF_POTATO_LEAGUES_DETAILS`  
    - Default: `enabled: false`

**Verification:**  
- Logs → `"GET /api/leagues/1/members 200"`  
- SQL → `SELECT COUNT(*) FROM league_memberships WHERE league_id = 1 AND is_active = true;`  
- API → `curl /api/leagues/1/members` → `{ members: [{ email: "user@example.com" }], count: N }`  
- Rollback → Toggle `FF_POTATO_LEAGUES_DETAILS=false`  

---

### Phase 2: Frontend - League Details Route & Page
**Goal:** Create League Details page component and routing.  

**Scope:**  
- Create `client/src/pages/LeagueDetailsPage.tsx`:
    - Accept `leagueId` as route param  
    - Fetch league info from `/api/leagues` (find by ID)  
    - Fetch members from `/api/leagues/:id/members`  
    - Display league header (image, title, description)  
    - Display member list (emails only)  
    - Show loading state (skeleton) and “No active members” message when empty  
- Add route in `client/src/AppRoutes.tsx`:
    ```tsx
    <Route path="/leagues/:id">
      <AuthGuard>
        <LeagueDetailsPage />
      </AuthGuard>
    </Route>
    ```
- Check `ff.potato.leagues.details` before rendering.  

**Verification:**  
- Logs → `"LeagueDetailsPage loaded for league: 1"`  
- Frontend → Navigate to `/leagues/1`, see league + members  
- Empty case → Shows “No active members”  
- Rollback → Toggle `FF_POTATO_LEAGUES_DETAILS=false`  

---

### Phase 3: Frontend - Clickable Navigation from LeagueCard
**Goal:** Make LeagueCard in Active tab clickable to open details page.  

**Scope:**  
- Update `LeagueCard.tsx`:  
    - Add `onClick` handler → navigate to `/leagues/${id}`  
    - Use `useLocation` (wouter) for navigation  
    - Apply `cursor: pointer` styling  
- Only active tab cards (with `completionMode=true`) should be clickable.  

**Verification:**  
- Logs → `"Navigating to league details: 1"`  
- Click card in Active tab → `/leagues/1` loads  
- Click card in List tab → no navigation  
- Rollback → Disable via feature flag  

---

### Phase 4: Frontend - Completion CTA on Details Page
**Goal:** Add "Mark Completed" button to Details page.  

**Scope:**  
- Reuse existing `useCompleteLeague` hook  
- Show CTA if `completedAt === null`, else show disabled “Completed ✓” button  
- Invalidate `['leagues']` query after marking completed (updates Active tab)  
- Ensure button states are consistent across Active tab + Details page  

**Verification:**  
- Logs → `"Membership action=complete for user=<uuid>, league=<id>"`  
- SQL → `SELECT completed_at FROM league_memberships WHERE user_id=? AND league_id=?;` → timestamp set  
- UI →  
    - Shows “Mark Completed” when incomplete  
    - Changes to “Completed ✓” after click  
    - State persists on reload and in Active tab  

---

### Phase 5: End-to-End Validation
**Goal:** Verify complete user journey and edge cases.  

**Tests:**  
1. Full journey:  
   - Join league from List tab → Appears in Active tab  
   - Click into league → See details + members  
   - Mark completed → UI updates  
   - Return to Active tab → League shows as completed  
2. Edge cases:  
   - League with 0 members → “No active members”  
   - League with 1 member (self only) → shows own email  
   - Multiple members → list all emails (alphabetical for predictability)  
   - Already completed league → disabled “Completed ✓” button  
   - Unauthenticated → redirect to login  
3. Performance:  
   - Ensure no N+1 queries (single JOIN query for members)  

**Verification:**  
- SQL counts match UI counts  
- User always appears in their own member list  
- Feature flag toggle hides entire flow instantly  

---
### Phase 6: Frontend – Join CTA for Non-Members
**Goal:** Allow non-members to view the League Details page and join a league from there.  

**Scope:**  
- Update `LeagueDetailsPage.tsx`:
  - Detect whether the current user has a membership record for this league.
  - If no active membership:
    - Show a **“Join” CTA** instead of “Mark Completed”.
    - On click, call `POST /api/leagues/:id/memberships` (existing join logic).
  - Once joined:
    - React Query invalidates `['leagues']` and details query.
    - CTA switches to “Mark Completed” (Phase 4 behavior).  
- Display all league details (header, description, members list) regardless of membership.  

**Verification:**  
- Logs:
  - Browser console → `"Join league requested: <id>"`
  - Server logs → `"Membership created for user=<uuid>, league=<id>"`  
- SQL:
  ```sql
  SELECT is_active FROM league_memberships 
  WHERE user_id = (SELECT id FROM users WHERE email='tommyjanszen@gmail.com') 
  AND league_id = <id>;
  ```
  → `is_active = true` after joining.  
- Frontend:
  - Non-member visiting `/leagues/:id` sees Join CTA.
  - Click Join → page refreshes → CTA becomes “Mark Completed”.
  - Active tab now shows league joined.  
- Rollback: Toggle `FF_POTATO_LEAGUES_DETAILS=false`.  

---

### Phase 7: Frontend – Navigation from List Tab to Details Page
**Goal:** Allow users to click LeagueCards in the **List tab** to open the League Details page.  

**Scope:**  
- Update `LeagueCard.tsx` to support navigation when rendered in the List tab:  
  - Add `onClick` handler for List tab cards (similar to Phase 3 implementation for Active tab).  
  - Use `useLocation` (wouter) to navigate to `/leagues/${id}`.  
  - Apply `cursor: pointer` styling when in List tab context.  
- Ensure CTA buttons (Join/Joined) still work independently — `stopPropagation()` must prevent triggering navigation when clicking CTAs.  
- Navigation behavior should be consistent with Active tab: clicking anywhere on the card (except the CTA) navigates to details.  

**Verification:**  
- Logs:  
  - Browser console → `"Navigating to league details (list tab): <id>"` when clicking a List tab card.  
- Frontend:  
  - From List tab, click a LeagueCard → navigates to `/leagues/:id`.  
  - Details page loads with league info, member list, and correct CTA (Join or Mark Completed).  
  - From Active tab, navigation continues to work as before (Phase 3).  
- CTA Isolation:  
  - Clicking “Join” or “Joined” button on List tab cards triggers membership action but does **not** navigate to details.  
- Feature flag: With `FF_POTATO_LEAGUES_DETAILS=false`, navigation still happens but page renders null.  

**Rollback:**  
- Disable `FF_POTATO_LEAGUES_DETAILS` → League Details page hidden.  
- No schema or backend changes needed.  

---


### Phase 8: Frontend – Back Navigation
**Goal:** Add a back arrow on League Details page to return to the previous tab (Active or List).  

**Scope:**  
- Update `LeagueDetailsPage.tsx`:  
  - Add a back arrow button in the header (top-left).  
  - On click:
    - If navigated from Active tab → return to `/leagues?tab=active`.  
    - If navigated from List tab → return to `/leagues?tab=list`.  
  - For MVP, track “origin tab” via React Router state or fallback to `/leagues` if unknown.  

**Verification:**  
- Logs:
  - Browser console → `"Back navigation triggered: returning to active tab"`  
- Frontend:
  - From Active tab: click card → details page → back → returns to Active tab.  
  - From List tab: click card → details page → back → returns to List tab.  
- Rollback: Disable feature flag → back arrow hidden.  

---

### Phase 9: End-to-End Validation (Extended)
**Goal:** Validate full details page flow for both members and non-members.  

**Tests:**  
1. **Non-member flow:**
   - Visit `/leagues/:id` (not joined).  
   - See league details + members list.  
   - Join league via CTA.  
   - CTA switches to “Mark Completed”.  
   - Active tab updates.  
2. **Member flow:**
   - Already joined user visits `/leagues/:id`.  
   - CTA shows “Mark Completed” (if not completed).  
   - Clicking completes league (Phase 4 behavior).  
   - CTA switches to “Completed ✓”.  
3. **Back navigation:**
   - From Active tab → details → back → Active tab.  
   - From List tab → details → back → List tab.  
4. **Edge cases:**
   - Empty league (0 members) → “No active members yet”.  
   - Completed league → disabled CTA.  
   - Flag disabled → details page hidden.  

**Verification:**  
- SQL:
  ```sql
  SELECT league_id, is_active, completed_at 
  FROM league_memberships 
  WHERE user_id = (SELECT id FROM users WHERE email='tommyjanszen@gmail.com');
  ```
  → reflects join/complete states correctly.  
- UI: CTAs transition correctly for join → complete.  
- Feature flag toggle hides feature instantly.  

---



## Key Risk Mitigations
- **Feature flag**: `ff.potato.leagues.details` gates the entire feature  
- **No schema changes**: Keeps DB safe  
- **Reused logic**: Avoids duplicating completion code  
- **Incremental rollout**: Each phase independently verifiable  

---

## Summary
This plan introduces the League Details page in **5 phases**, with:  
- ✅ New API endpoint: `GET /api/leagues/:id/members`  
- ✅ New page: `LeagueDetailsPage.tsx`  
- ✅ New route: `/leagues/:id`  
- ✅ Controlled rollout via feature flag  

Small UX refinements included:  
- Show skeleton loader + empty state in member list  
- Alphabetically sort emails for consistency  
- Ensure completion CTA state matches Active tab  

This approach ensures a safe, incremental rollout with clear rollback points.
