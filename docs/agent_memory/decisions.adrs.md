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

**Follow-up (2025-09-07):**  
Phase 6E-Lite (Single-User Cutover) successfully executed after Phase 6X validation.  
This validates the cutover strategy in a real environment.  
Future phases can use the simplified cutover model when user base is small, provided endpoints and migrations are validated first.

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

## ADR-2025-09-07 Authenticated Endpoint Validation
**Context:** During Phase 6X, V2 endpoints returned 401 Unauthorized on validation attempts because requests were unauthenticated. This was initially mistaken for server instability.  
**Decision:** All implementation plans must explicitly account for authentication when validating protected endpoints. Exit Criteria for any authenticated endpoint must include validation using a valid session.  
**Consequences:**  
- Prevents misinterpreting 401s as crashes  
- Ensures functional validation reflects real user flows  
- Adds requirement to create/login a test user in validation steps  
**Status:** Accepted (2025-09-07)

---
## ADR-2025-09-08: Doc Organization Rule

**Context:** Phase-specific artifacts (like validation evidence and operator playbooks) were previously stored in `docs/agent_memory/`, cluttering core long-term memory.  

**Decision:** Create a dedicated `docs/phase_artifacts/` folder for all phase-specific outputs. Restrict `docs/agent_memory/` to long-term memory only (plans, ADRs, playbooks, bug journals, glossary, features_overview, daily briefs, fast follows).  

**Consequences:**  
- Prevents clutter and confusion in `agent_memory/`  
- Ensures agents always know where to find long-term vs temporary docs  
- Supports project scale with clean separation of artifacts  

**Status:** Accepted (2025-09-08)

## ADR-2025-09-11 Runs Calculation Wiring Fix (Phase 6B-1)
**Context:** Runs table remains empty despite day_marks data existing because runs calculation logic exists in server/storage.ts but runtime imports server/storage.js. Phase 6B-1 (Idempotent Core Operations) was never completed, leaving day marking flow disconnected from runs calculation.  
**Decision:** Port runs calculation logic from storage.ts to storage.js and wire into markDay() flow. Use incremental phased approach: A) wire performRunExtend, B) add merge logic, C) backfill existing data, D) complete Phase 6B-1 operations.  
**Status:** Accepted  
**Alternatives Considered:** Migrate runtime to TypeScript (rejected: broader changes, compilation complexity)  
**Consequences:** Fixes blocking issue for Phase 7C-1 dashboard but requires porting TypeScript logic to JavaScript and backfilling existing user data  
**Links:** bugs_journal.md [2025-09-11 Broken Wiring], imp_plans/2025-09-11-runs_calc_fix.md, server/storage.js, server/storage.ts

## ADR-2025-09-12: Phase 6B-1 Status Correction

### Context
Phase 6B-1 (“Idempotent Core Operations”) was originally marked ✅ COMPLETE in `imp_plans/v2.md`.  
An audit on 2025-09-12 revealed that this status was inaccurate:

- Required SQL functions (`perform_run_extend`, `perform_run_merge`, `perform_run_split`) do not exist.
- Partial JavaScript-layer helpers exist (`extendRunWithDate`, partial `performRunMerge`).
- Split (day removal) is entirely unimplemented.
- As a result, idempotency, merge, and split cannot be validated using the specified test criteria.

### Decision
Phase 6B-1 is officially marked ❌ INCOMPLETE.  
A separate implementation plan (`imp_plans/6b1_completion.md`) has been created to finish the missing work:
- Implement SQL-level idempotent run operations.
- Wire them into `markDay()`.
- Validate with explicit SQL tests and invariants.

### Consequences
- `imp_plans/v2.md` must reflect 6B-1 as ❌ incomplete until completion plan is executed.
- Totals/dashboard features (Phase 7) can proceed, but:
  - Past-day marking requires full rebuilds for accuracy.
  - Gap fill (merge) does not occur automatically.
  - Unmarking/removal is unsupported.
- Future Phases (especially Phase 8: property-based testing) are blocked until 6B-1 is truly complete.
- A short-term recovery (auto-rebuild for test users) mitigates UI issues but does not replace 6B-1 functionality.

### Status
Accepted — 2025-09-12

## ADR-2025-09-22 Progress Header Conditional Rendering with Feature Flags
**Context:** Users requested ability to remove "Your Progress" header and container styling to achieve cleaner minimal layout  
**Decision:** Implement FF_POTATO_PROGRESS_HEADER_V2 feature flag with conditional rendering in TotalsPanel component  
**Status:** Accepted & Implemented  
**Consequences:** Flag=false shows full UI (header+container+explanatory text), flag=true shows minimal UI (only 3 stat boxes)  
**Links:** client/src/components/TotalsPanel.tsx, server/feature-flags.js, docs/agent_memory/imp_plans/progress_header_v2.md

## ADR-2025-09-30 League Membership Rejoin Behavior Control
**Context:** When users leave and rejoin leagues, system must choose between creating new membership rows (audit trail) or reactivating existing rows (cleaner data model). Different use cases favor different approaches.  
**Decision:** Implement FF_POTATO_LEAGUES_MEMBERSHIP_UPDATE_MODE feature flag controlling rejoin behavior: OFF (default) = INSERT new row on rejoin, ON = UPDATE existing inactive row to reactivate membership  
**Status:** Accepted & Implemented  
**Consequences:** Flag OFF preserves complete audit trail with multiple rows per user-league over time; Flag ON maintains single row per user-league with cleaner data but overwrites join/leave timestamps on reactivation  
**Links:** server/feature-flags.js, server/league-membership.js (lines 67-100), league_memberships table
