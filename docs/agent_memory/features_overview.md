# Features Overview
- Keep this short; link to code/PRs instead of restating details.

## V2 Planned (Runs & Totals Tracking)
- **Database Foundations** — Flag: ff.potato.runs_v2 — Phase: 6A
  - [Schema design with non-overlap constraints](imp_plans/v2.md#phase-6a-database-foundations)
  - PostgreSQL EXCLUDE USING gist + SQLite trigger fallbacks
- **Algorithm & Transactions** — Flag: ff.potato.runs_v2 — Phase: 6B  
  - [Idempotent run calculation with per-user serialization](imp_plans/v2.md#phase-6b-algorithm--transactions)
  - <10ms transaction duration, <5 rows locked per operation
- **Backfill/Rebuild** — Flag: ff.potato.runs_v2 — Phase: 6C
  - [Administrative rebuild procedures](imp_plans/v2.md#phase-6c-backfillrebuild)
  - Deterministic algorithm with operator playbooks
- **Shadow Read & Diff** — Flag: ff.potato.runs_v2 — Phase: 6D
  - [V2 validation against legacy calculations](imp_plans/v2.md#phase-6d-shadow-read--diff)
  - Zero-diff requirement for production cutover
- **Cutover via Feature Flag** — Flag: ff.potato.runs_v2 — Phase: 6E
  - [Gradual rollout with SLI monitoring](imp_plans/v2.md#phase-6e-cutover-via-ffpotatoruns_v2)
  - Automated rollback triggers on quality gates
- **Totals Strategy** — Flag: ff.potato.totals_v2 — Phase: 7A
  - [Hybrid real-time + stored monthly aggregates](imp_plans/v2.md#phase-7a-totals-v2-feature-flagged)
  - Independent feature flag from runs_v2
- **Observability** — Flag: ff.potato.runs_v2 — Phase: 7B
  - [Structured events, SLI monitoring, health checks](imp_plans/v2.md#phase-7b-observability)
  - <50ms p95 run calculation latency target
- **Property-Based Testing** — No flags — Phase: 8
  - [Fuzz testing, timezone edges, determinism validation](imp_plans/v2.md#phase-8-property-based--fuzz-testing)
  - 10,000+ random scenarios, concurrency testing

## In Progress  
- **V2 Research Complete** — [Phase 0 spike findings](v2_phase0_research.md) validated algorithm design and data model
- **Ready for Phase 6A** — Database foundations implementation pending user approval

## V1 Live (Core Functionality)
- **Foundation & Database** — Flag: ff.potato.no_drink_v1 (ON) — [Phase: 0-5 COMPLETE](imp_plans/v1.md)
  - PostgreSQL schema: users, day_marks, click_events tables
  - Express server with feature flag gating, security headers, rate limiting
  - Health check endpoint operational, comprehensive monitoring
  - Storage layer with PostgreSQL integration
- **Authentication System** — Flag: ff.potato.no_drink_v1 (ON) — Phase: 1-2 COMPLETE
  - Email/password registration and login
  - Session management with timezone support
  - Calendar Data API with month-based retrieval and day marking
- **React Frontend** — Flag: ff.potato.no_drink_v1 (ON) — Phase: 3-4 COMPLETE
  - Calendar grid UI with drawer interactions, visual indicators
  - Performance optimizations, accessibility enhancements
  - Production-ready with 56+ verified day marks
- **Security & Monitoring** — Flag: ff.potato.no_drink_v1 (ON) — Phase: 5 COMPLETE
  - Helmet security headers, HTTPS redirect, rate limiting
  - Structured logging, performance monitoring, correlation IDs
  - Metrics endpoint with system health and error analytics