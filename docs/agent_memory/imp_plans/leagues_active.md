# 🏆 League Completion System – Implementation Plan

This document outlines the phased plan for extending the League system with a lightweight **manual completion state**, allowing users to mark a league as completed without adding complex rule logic.

---

## ✅ Current Implementation Review

### Database Schema
- `league_memberships` table with columns:
  - `id`, `userId`, `leagueId`, `isActive`, `joinedAt`, `leftAt`, `createdAt`, `updatedAt`
- Unique constraint: one active membership per user per league
- Feature flag support for membership rejoin behavior (`ff.potato.leagues.membership.update_mode`)

### Backend API
- `POST /api/leagues/:id/memberships` → Join league logic with reactivation support
- `DELETE /api/leagues/:id/memberships` → Leave league (sets inactive + `leftAt`)
- `GET /api/leagues/:id/membership` → Get user membership status
- `GET /api/leagues` → List leagues with member counts + user membership data

### Frontend
- **LeagueCard** with Strava-style CTAs:
  - Orange (#FF5A1F) → "Join"
  - Green (#28A745) → "Joined"
- React Query integration with cache invalidation
- LeaguesPage with tabs: *Active*, *List*, *Clubs* (gated by `ff.potato.leagues_tabs`)
- CSV ingestion system for dynamic league content

---

## 🎯 Phased Implementation Plan

### Phase 1: Database Schema Extension
**Goal:** Add completion tracking to existing `league_memberships` table.

**Changes:**

    ALTER TABLE league_memberships 
    ADD COLUMN completed_at TIMESTAMP NULL;

**Implementation:**
- Update `shared/schema.ts` with `completed_at: timestamp('completed_at')`
- Extend Zod validation schemas and TypeScript types (`LeagueMembership`, `NewLeagueMembership`)

**Validation:**
- SQL query confirms column exists:

    \d+ league_memberships

- No existing data affected (all `completed_at` values start as NULL)

---

### Phase 2: Backend API Extension
**Goal:** Extend membership endpoint to support marking completion.

**API Contract Changes:**

    // Extend POST /api/leagues/:id/memberships
    {
      action?: 'join' | 'complete'
    }

**Response:**

    {
      id: "uuid",
      userId: "uuid",
      leagueId: 1,
      isActive: true,
      joinedAt: "2025-09-29T10:00:00Z",
      leftAt: null,
      completed_at: "2025-09-29T15:30:00Z"
    }

**Implementation:**
- Add `markCompleted(userId, leagueId)` in `server/league-membership.js`
- Extend `POST /api/leagues/:id/memberships` to handle `action=complete`
- Ensure **idempotency** (safe to call multiple times → same completed state)
- Add logging:

    console.log(`Completion marked for user ${userId}, league ${leagueId}`);

**Business Logic:**
- User must have an **active membership** to complete
- Once set, `completed_at` cannot be cleared
- Completion does **not** affect `isActive` (league remains in Active tab)

**Recommended tweak:**  
Consider an alternate endpoint (`POST /api/leagues/:id/memberships/complete`) if additional actions are added in the future. This avoids overloading a single endpoint with too many modes.

---

### Phase 3: Feature Flag Integration
**Goal:** Gate rollout with `ff.potato.leagues.active`.

**Implementation:**
- Add `ff.potato.leagues.active` in `server/feature-flags.js`
- Backend respects the flag for completion behavior
- Frontend hides completion CTAs unless flag is enabled

**Rollout:**
- Default OFF for controlled rollout
- Can be toggled per environment

---

### Phase 4: Frontend Active Tab Enhancement
**Goal:** Show joined leagues with completion CTAs.

**Features:**
- Active tab queries `GET /api/leagues` filtered by `userMembership.isActive = true`
- LeagueCard variants:
  - Incomplete → "Mark Completed" CTA (orange)
  - Completed → "Completed ✓" badge (green, disabled)

**LeagueCard Enhancements:**
- New prop: `completionMode?: boolean` for Active tab
- Disabled CTA after completion
- Styling matches existing theme

**Recommended tweak:**  
Skip optimistic UI updates for completion — wait for server confirmation since this is a one-way irreversible action.

---

### Phase 5: Testing & Validation
**Proof Requirements:**

**Logs:**
- Must show:  
  `"Completion marked for user {userId}, league {leagueId}"`

**SQL:**

    SELECT user_id, league_id, is_active, completed_at
    FROM league_memberships
    WHERE completed_at IS NOT NULL;

- Rows appear only for completed leagues

**API:**
- `POST /api/leagues/:id/memberships` with `action=complete` → returns `completed_at`
- `GET /api/leagues/:id/membership` → includes `completed_at` if completed

**Frontend:**
- Active tab lists joined leagues
- CTA flips to "Completed ✓" and disables
- League remains visible in Active tab
- No ability to unmark completion

---

## 🔧 Technical Notes

### Database Migration
- Safe: adds nullable column only
- Backwards compatible: existing APIs return `null` for `completed_at`

### API Endpoint
- Extend existing route for now
- Future option: separate endpoint for completion

### Frontend State Management
- Invalidate `['leagues']` cache on completion
- Use server-confirmed updates (not optimistic)
- Handle network errors gracefully

### Feature Flag Architecture
- Single flag `ff.potato.leagues.active` controls entire feature
- Disabled → Active tab shows placeholder

### Error Handling Protocol
- If migration fails → STOP, inspect DB, retry
- If API contract mismatch → STOP, consider versioning
- If frontend crashes → STOP, disable feature via flag

---

## 🚫 Out of Scope (Deferred)
- New `league_completions` table
- Automated rule enforcement
- League start/end dates
- Completion analytics or leaderboards

---

## 📌 Summary
This plan delivers a minimal, user-friendly way for members to mark league completion while preserving system simplicity. It adds a single column, extends existing APIs, and enhances the Active tab UI. Rollout is gated by the feature flag `ff.potato.leagues.active`, and each phase is independently testable. Future analytics and rules can build on this foundation.
