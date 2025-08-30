# Features Overview
- Keep this short; link to code/PRs instead of restating details.

## Planned
- **Authentication System** — Flag: ff.potato.no_drink_v1 — Owner: Agent — Phase: 1
  - Email/password registration and login
  - Session management with timezone support
- **Calendar Data API** — Flag: ff.potato.no_drink_v1 — Owner: Agent — Phase: 2
  - Month-based calendar data retrieval
  - Day marking with timezone-aware validation
- **React Frontend** — Flag: ff.potato.no_drink_v1 — Owner: Agent — Phase: 3
  - Calendar grid UI with drawer interactions
  - Visual indicators for marked days

## In Progress
- None (awaiting Phase 1 approval)

## Live
- **Foundation & Database** — Flag: ff.potato.no_drink_v1 (OFF) — Phase: 0 COMPLETE
  - PostgreSQL schema: users, day_marks, click_events tables
  - Express server with feature flag gating
  - Health check endpoint operational
  - Storage layer with PostgreSQL integration