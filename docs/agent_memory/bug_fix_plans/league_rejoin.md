# 🛠️ League Rejoin Bug Fix Plan

## 📋 Context
- Users **can rejoin** leagues, but:
  1. **Critical Bug** – Frontend shows wrong membership state (query returns oldest row).  
  2. **Design Issue** – Each rejoin creates a new row, leading to data bloat.

---

## 🚀 Phase 1: Critical Frontend State Fix
**Goal:** Ensure API returns the latest membership status.

- **Change:**  
  In `server/league-membership.js` (line 145), update ordering:  

    .orderBy(leagueMemberships.createdAt.desc())

- **Verification:**  
  - Rejoin a league → `GET /api/leagues/:id/membership` returns latest active record.  
  - Frontend `LeagueCard` CTA flips correctly between `Join` / `Joined`.

---

## 🚀 Phase 2: Optional Backend Data Model Enhancement
**Goal:** Prevent unnecessary row creation on rejoin.

- **Change:**  
  - In `joinLeague` logic, first check for an inactive membership for `(userId, leagueId)`.  
  - If found → `UPDATE` it to `isActive=true, leftAt=null, updatedAt=NOW()`.  
  - If not found → proceed with new `INSERT`.

- **Verification:**  
  - Join → Leave → Rejoin should only toggle one record (no duplicate rows).  
  - SQL check:  

    SELECT user_id, league_id, is_active, joined_at, left_at
    FROM league_memberships
    WHERE user_id = (SELECT id FROM users WHERE email='tommyjanszen@gmail.com')
      AND league_id = <league_id>;

    → Should return at most **one row** for that league.

---

## 🚀 Phase 3: Testing & Clean-up
**Goal:** Validate both fixes and reduce noise.

- **Steps:**  
  - Write regression test: join → leave → rejoin → confirm frontend + DB state.  
  - Backfill cleanup script (optional): archive or delete duplicate inactive rows.

- **Verification:**  
  - Automated test passes.  
  - Manual UI test confirms correct CTA state.  
  - DB remains clean (no infinite row growth).  

---

## ⚠️ Risks & Mitigation
- Phase 1 bug fix is low-risk, should be deployed first.  
- Phase 2 update logic changes DB write path → gate with feature flag `ff.potato.leagues.membership.update_mode`.  
- Rollback: disable flag, fallback to current “always insert” model.  
