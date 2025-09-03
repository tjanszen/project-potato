# Architecture Decision Records (ADRs)
> Use for decisions that change architecture or business rules. Keep ≤20 lines each.

## ADR-2025-08-30 Feature Flag Gating Strategy
**Context:** All functionality must ship behind feature flags for safe rollout control  
**Decision:** Use ff.potato.no_drink_v1 as master flag (default OFF) with middleware gating all endpoints  
**Status:** Accepted  
**Consequences:** Adds slight complexity but enables zero-downtime feature deployment  
**Links:** server/feature-flags.ts, server/index.ts

## ADR-2025-08-30 Dual-Table Event Storage Pattern
**Context:** Need both current state and audit trail for day markings  
**Decision:** Implement event sourcing with click_events (append-only) + day_marks (deduped state)  
**Status:** Accepted  
**Consequences:** Slight storage overhead but enables better debugging and future analytics  
**Links:** shared/schema.ts, PostgreSQL tables

## ADR-2025-08-30 PostgreSQL Over In-Memory Storage
**Context:** Need persistent data storage with ACID guarantees for user data  
**Decision:** Use PostgreSQL with UUID primary keys and proper constraints  
**Status:** Accepted  
**Consequences:** More complex setup but production-ready with data integrity  
**Links:** shared/schema.ts, server/storage.ts

## ADR-2025-08-30 Timezone-Aware Date Handling
**Context:** "Today" varies by user timezone for global users  
**Decision:** Store user timezone preference and validate dates server-side in user's timezone  
**Status:** Accepted  
**Consequences:** Complex date logic but correct user experience across timezones  
**Links:** users table timezone field, future validation logic

### ADR: Canonical Server Entry Point
**Context:** Confusion between TypeScript file (server/index.ts) and runtime file (index.js) led to features being added in the wrong place.  
**Decision:** Consolidate on index.js as the canonical runtime server entry point.  
**Status:** Accepted.  
**Consequences:**  
- Future features must be added to index.js  
- server/index.ts should be treated as legacy/development only until tooling is unified  
- Reduces confusion and prevents code being added in non-executed files