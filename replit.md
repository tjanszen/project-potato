# Overview

This project is a minimalist habit tracking web application designed to help users record "No Drink" days on a calendar interface. Its primary purpose is to provide a straightforward way for users to track their alcohol-free days, with a foundation built for future expansion into features like streak tracking and badges. The application emphasizes phase-gated development using feature flags, ensuring controlled rollout of functionalities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Calendar-centric UI**: Single dashboard view featuring a scrollable monthly calendar (limited to 2025).
- **Interactive Drawer System**: Clicking on calendar days opens a drawer for marking functionality.
- **Timezone-aware Display**: Calendar dates are displayed according to the user's configured timezone.
- **Visual Feedback**: Marked days are indicated with subtle filled dots and color.
- **Toast Notifications**: Provides user feedback for actions (success/failure).
- **Performance Optimized**: Utilizes debounced interactions and memoized calculations for responsiveness.
- **Accessibility Enhanced**: Includes focus management, ARIA attributes, and keyboard navigation.

## Backend Architecture
- **Feature Flag System**: All functionalities are gated behind feature flags (e.g., `ff.potato.no_drink_v1`, default OFF).
- **Dual-table Data Model**: Employs `click_events` for an append-only audit trail and `day_marks` as a deduplicated state table with unique constraints.
- **Timezone Handling**: Server-side validation uses the user's timezone for accurate date range determination.
- **Date Validation**: Enforces a backdating window from 2025-01-01 to the current date in the user's timezone.
- **Idempotency**: Designed to prevent duplicate operations from multiple clicks on the same day.

## Authentication & Authorization
- **Email/Password Authentication**: A simple credential-based authentication system.
- **Password Hashing**: Secure storage of user credentials.
- **User-scoped Data**: All day marks and events are tied to authenticated user accounts.

## Data Storage Design
- **PostgreSQL Database**: Primary relational database using UUID v4 for primary keys.
- **Event Sourcing Pattern**: Combines an immutable event log with a materialized state table.
- **Unique Constraints**: Prevents duplicate day marks per user via `UNIQUE (user_id, date)`.
- **Timezone Storage**: User timezone preference stored as text (e.g., "America/New_York").
- **Date-only Semantics**: Days stored in YYYY-MM-DD format, independent of time.

## Business Logic Constraints
- **Truth Table Logic**: Only stores `true` for "No Drink" days; absence implies an unknown state.
- **Future Extensibility**: Data model designed to accommodate future `false` values (e.g., "Did Drink") with last-write-wins semantics.
- **Validation Rules**: Server-side enforcement of date boundaries and timezone-aware current date calculations.

# External Dependencies

## Database
- **PostgreSQL**: Used for primary data storage.

## Implemented Dependencies
- **Express.js**: Backend web framework used for handling requests, CORS, and sessions.
- **Drizzle ORM**: Facilitates PostgreSQL interaction, schema management, and type safety.
- **bcryptjs**: Used for secure password hashing.
- **React + Vite**: Frontend framework setup.
- **date-fns**: Utilized for timezone handling and date calculations.
- **Zod**: Employed for runtime validation, including integration with Drizzle-Zod.

## Feature Flag System
- **Feature Toggle Infrastructure**: Essential for managing the `ff.potato.no_drink_v1` flag and other future feature gates.

# Recent Changes

## 2025-09-08
- **Phase 7A-1 & 7A-2 Complete**: Hybrid totals strategy implemented with `run_totals` schema and reconciliation system
- **ADR-2025-09-08**: Doc Organization Rule established → created `docs/phase_artifacts/` for phase-specific outputs
- **Schema Patch Plan**: Added between Phase 7C-1 and 7C-2 to fix missing `day_marks` table (root cause of 500 errors)
- **Right-Sizing Updates**: Simplified Phase 7A-3 and 7B-Lite for ~100-500 user base, broke Phase 7C into manageable sub-phases
- **File Organization**: Moved phase artifacts out of `agent_memory/`, updated playbooks with new organizational rules