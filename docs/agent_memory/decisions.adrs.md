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

## ADR-2025-09-03 Canonical Server Entry Point
**Context:** Architectural confusion between TypeScript development file (server/index.ts) and JavaScript runtime file (index.js) caused authentication routes to be added in non-executed files, resulting in 404 errors and server crashes during Phase 4A implementation  
**Decision:** Consolidate on index.js as the canonical runtime server entry point for all backend routes and middleware  
**Status:** Accepted  
**Consequences:** Eliminates route registration failures and server crashes but creates temporary TypeScript/JavaScript split until build tooling is unified  
**Links:** bugs_journal.md [2025-09-03 Authentication & Server Entry Point Issues], playbooks.md "Server Entry Point Confusion", package.json main field

## ADR-2025-09-06 Non-Overlapping Date-Range Runs with Single Active Run
**Context:** V2 runs tracking requires data consistency guarantees: no overlapping runs per user, deterministic rebuilds from day_marks, and reliable concurrent access patterns  
**Decision:** Implement dedicated runs table with PostgreSQL EXCLUDE USING gist constraints for non-overlapping date ranges, unique active run per user, and facts-as-source architecture with deterministic rebuild capability  
**Status:** Accepted  
**Consequences:** Higher complexity but production-grade data integrity with ACID guarantees; requires PostgreSQL-specific features with SQLite trigger-based fallback  
**Links:** imp_plans/v2.md [Data Invariants section], v2_phase0_research.md [Data Model Decision], shared/schema.ts [runs table]

## ADR-2025-09-06 Immutable Local Date Policy for Timezone Independence
**Context:** User timezone changes could retroactively affect historical day marking calculations, creating data inconsistency and user confusion about past achievements  
**Decision:** Store `local_date` as immutable at mark time; past marks are never reinterpreted when user changes timezone; timezone migration requires explicit administrative rebuild action only  
**Status:** Accepted  
**Consequences:** Simplified temporal logic and consistent historical data but requires admin intervention for timezone corrections; users accept historical dates reflect timezone at time of marking  
**Links:** imp_plans/v2.md [Timezone Policy], shared/schema.ts [day_marks.local_date column]