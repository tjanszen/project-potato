# League Membership Implementation Plan

This plan introduces the ability for users to **join and leave leagues**.  
It extends the existing CSV-based leagues ingestion by adding a new **membership system**.

---

## 📊 Current State Analysis

### ✅ What We Have
- **Authentication:** Users table with sessions & middleware.
- **Feature Flags:**  
  - `ff.potato.leagues_csv` → controls ingestion of league data.  
- **Leagues Data:** 8 leagues defined via `/data/leagues.csv`.
- **Frontend:** React Query + LeagueCard components rendering from CSV.
- **Database:** PostgreSQL with Drizzle ORM.

### ❌ What We Need
- Database table for **league memberships**.
- Backend API endpoints for **join/leave**.
- Updated LeagueCard with **Join/Joined CTA**.
- Frontend integration for membership state.

---

## 🗄️ Database Schema Design

### New Table: `league_memberships`

    CREATE TABLE league_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      league_id INTEGER NOT NULL, -- References CSV league_id
      is_active BOOLEAN NOT NULL DEFAULT true,
      joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
      left_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

      -- Constraints
      UNIQUE(user_id, league_id, is_active) WHERE is_active = true
    );

    -- Indexes for performance
    CREATE INDEX idx_league_memberships_user_id ON league_memberships(user_id);
    CREATE INDEX idx_league_memberships_league_id ON league_memberships(league_id);
    CREATE INDEX idx_league_memberships_active ON league_memberships(league_id, is_active);

### Drizzle Schema (in `shared/schema.ts`)

    export const leagueMemberships = pgTable('league_memberships', {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
      leagueId: integer('league_id').notNull(), // from CSV
      isActive: boolean('is_active').notNull().default(true),
      joinedAt: timestamp('joined_at').notNull().defaultNow(),
      leftAt: timestamp('left_at'),
      createdAt: timestamp('created_at').notNull().defaultNow(),
      updatedAt: timestamp('updated_at').notNull().defaultNow(),
    }, (table) => ({
      uniqueActiveMembership: unique().on(table.userId, table.leagueId, table.isActive).where(sql`is_active = true`),
      userIdx: index('membership_user_idx').on(table.userId),
      leagueIdx: index('membership_league_idx').on(table.leagueId),
      activeIdx: index('membership_active_idx').on(table.leagueId, table.isActive),
    }));

---

## 🚀 Phased Implementation Plan

### Phase 1: Database Foundation
**Priority:** HIGH | **Risk:** LOW | **Duration:** 1–2 hours

**1A. Schema Definition**
- Add `leagueMemberships` table to `shared/schema.ts`.
- Create Zod validation schemas + TS types.

**1B. Database Migration**
- Use `drizzle-kit` migrations instead of `db:push --force`.  
  Example:

    npx drizzle-kit generate
    npx drizzle-kit push

- Verify table creation with SQL query.
- Test basic insert/query for memberships.

**Proof**
- Table exists and can store/query membership records.

---

### Phase 2: Backend API Development
**Priority:** HIGH | **Risk:** MEDIUM | **Duration:** 2–3 hours

**2A. Membership Logic Layer**
- Create `server/league-membership.js` service.
- Implement **join/leave logic** with soft delete (`is_active=false`).
- Add aggregation functions to count active members.

**2B. RESTful API Endpoints**
- `POST /api/leagues/:id/memberships` → join a league.
- `DELETE /api/leagues/:id/memberships` → leave a league.
- `GET /api/leagues/:id/membership` → fetch current user’s status.
- Extend `GET /api/leagues` → include:
  - `memberCount` (active users only).
  - `userMembership` (joinedAt, isActive, leftAt if applicable).

**Proof**
- Endpoints return correct membership + count data.

---

### Phase 3: Frontend Components
**Priority:** HIGH | **Risk:** MEDIUM | **Duration:** 2–3 hours

**3A. Enhanced API Client**
- Add methods to `client/src/lib/api.ts`:
  - `joinLeague(id)`
  - `leaveLeague(id)`
  - `getLeagueMembership(id)`
- Implement React Query **mutations**.

**3B. Updated LeagueCard Component**
- Add `userMembership` prop.
- Add CTA button:
  - `Join` → triggers join API call.
  - `Joined` → triggers leave API call.
- **Change vs. original plan:**  
  Instead of optimistic updates, simply **refetch memberships after mutation** to keep state consistent and avoid bugs.

**3C. LeaguesPage Integration**
- Fetch memberships + pass down to LeagueCards.
- Refresh counts and CTA state after API calls.

**Proof**
- User can join/leave leagues; button states update on refresh.

---

### Phase 4: Feature Flag & Polish
**Priority:** MEDIUM | **Risk:** LOW | **Duration:** 1–2 hours

**4A. Feature Flag**
- Add new feature flag:

    'ff.potato.leagues.membership': {
      name: 'ff.potato.leagues.membership',
      enabled: false,
      description: 'Enables user league selection (join/leave)',
    }

- Gate join/leave functionality behind this flag.

**4B. UX & Error Handling**
- Loading states for API calls.
- Toast notifications for success/error.
- Graceful fallback if API errors occur.

**4C. Testing**
- Validate toggling membership on frontend.
- Confirm counts update after join/leave.
- Ensure API rejects unauthenticated requests.

---

## 🔧 Technical Notes

### API Specs

    POST /api/leagues/:id/memberships
    → Body: { leagueId: number }
    → Response: { success: true, membership: { joinedAt, isActive }, memberCount }

    DELETE /api/leagues/:id/memberships
    → Response: { success: true, membership: { leftAt, isActive: false }, memberCount }

    GET /api/leagues
    → Returns leagues with memberCount + userMembership

### LeagueCard CTA States

    const getButtonConfig = (userMembership) => {
      if (!userMembership || !userMembership.isActive) {
        return { text: "Join", variant: "primary", action: "join" }
      }
      return { text: "Joined", variant: "success", action: "leave" }
    }

---

## ⚠️ Risks & Mitigation

- **Migration Safety:** Use drizzle-kit migrations instead of destructive `db:push --force`.  
- **API Naming:** RESTful style ensures future scalability.  
- **Frontend Sync:** Refetch after join/leave avoids state drift.  
- **Counts:** For now, calculate on demand. Cache later if needed.  
- **Feature Flags:** Keep `ff.potato.leagues_csv` and `ff.potato.leagues.membership` documented together.

---

## 🎯 Success Criteria
- ✅ Database: Membership table exists, supports joins/leaves, soft delete works.  
- ✅ Backend: REST endpoints functional, return correct counts + membership.  
- ✅ Frontend: LeagueCard Join/Joined CTA works, state refetches correctly.  
- ✅ Flags: Feature flag controls rollout cleanly.  

---
