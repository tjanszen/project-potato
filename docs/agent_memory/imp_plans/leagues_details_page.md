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
