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

## ADR-2025-09-07 Frontend Integration as Explicit Phase
**Context:** V2 frontend work (runs history, totals dashboard) could be hidden inside backend phases, reducing visibility of user-facing development and rollback safety  
**Decision:** Frontend integration must be tracked as its own implementation phase (Phase 7C), feature-flagged independently, not embedded within backend totals/runs phases  
**Status:** Accepted  
**Consequences:** Improves visibility of user-facing work, ensures rollback safety, and maintains parity with V1's Dashboard Integration phase approach  
**Links:** imp_plans/v2.md [Phase 7C: Frontend Integration]

## ADR-2025-09-06 Lightweight Cutover Strategy for Small User Base
**Context:** Earlier plans (e.g., Phase 6E) assumed enterprise-scale gradual rollout with dashboards, alerts, and staged rollout percentages (0% → 10% → 50% → 100%). In the current environment, production has only 1–few users, making such strategies overkill.  
**Decision:** All cutover phases (current and future) will use a lightweight approach: enable the new feature behind a feature flag, run manual validation checks, and roll back by toggling the flag off if needed. No multi-stage rollout or heavy monitoring is required at this scale.  
**Status:** Accepted  
**Consequences:**  
- Faster, simpler cutovers appropriate for a small user base  
- Manual validation replaces complex automated rollout steps  
- Feature flags remain the safety net for rollback  
- If the user base grows, more robust staged rollout strategies (dashboards, alerts, gradual percentage rollout) may be reintroduced  
**Links:** imp_plans/v2.md [Phase 6E-Lite] and future phases that involve cutovers

## ADR-2025-09-06 Frontend Integration as Explicit Phase
**Context:** In v1, frontend updates (Dashboard Integration) were handled as explicit implementation phases. In v2, Phase 7C: Frontend Integration was added in the same style, but initially documented as a one-off. To avoid ambiguity, frontend integrations should always be treated as explicit, feature-flagged phases.  
**Decision:** All future frontend integrations will be tracked as their own implementation phases, feature-flagged independently, not bundled invisibly into backend or totals phases. This ensures visibility of user-facing work, clear rollback paths, and consistency with established practice.  
**Status:** Accepted  
**Consequences:**  
- Consistent project structure: backend and frontend work both get explicit phases  
- Rollback safety: frontend components always gated behind feature flags  
- Prevents confusion where UI updates are hidden inside backend milestones  
- Matches v1 and v2 precedent (Dashboard Integration, Phase 7C)  
**Links:** imp_plans/v1.md [Dashboard Integration], imp_plans/v2.md [Phase 7C: Frontend Integration]

## ADR-2025-09-06 Explicit Endpoint & Storage Phasing
**Context:** Phase 6E cutover assumed V2 endpoints and storage methods already existed, but they had not been implemented. This caused server crashes, TypeScript errors, and unstable testing.  
**Decision:** All future implementation plans must explicitly phase in endpoint and storage method implementation before cutover or shadow phases. Documentation cannot assume these layers already exist.  
**Consequences:** Prevents plan-code drift, reduces risk of unstable cutovers, and ensures validation occurs incrementally.  
**Status:** Accepted (2025-09-06)

## ADR-2025-09-06 Mid-Phase Error Handling Standard
**Context:** During Phase 6E, the agent worked for an extended time encountering multiple errors without pausing, leading to wasted compute and unclear progress. This ADR was triggered by issues discovered during Phase 6E (see bugs_journal.md entry [2025-09-06] V2 Endpoints & Storage Missing).  
**Decision:** All implementation plans (current and future) must include an Error Handling Clause requiring the agent to stop, summarize, and recommend next steps when significant errors are encountered mid-phase. Each phase and sub-phase must explicitly state compliance with this clause.  
**Consequences:**  
- Prevents runaway error handling loops  
- Reduces wasted compute costs  
- Ensures human oversight before further execution  
- Increases clarity and trust in agent execution  
- Cross-reference: bugs_journal.md [2025-09-06] V2 Endpoints & Storage Missing documents the incident that led to this ADR.  
**Status:** Accepted (2025-09-06)