# Overview

This project is a web application for tracking "No Drink" days on a calendar. It provides a minimal dashboard where users can mark specific days as alcohol-free. The core purpose is to offer a simple, focused habit-tracking tool, with a development strategy that uses feature flags for controlled rollout and future expansion. The long-term ambition is to create a robust, user-friendly platform for self-improvement, starting with this fundamental habit.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Calendar-centric UI**: Single dashboard with a scrollable monthly calendar (limited to 2025).
- **Interactive drawer system**: Clicking calendar days opens a drawer for marking functionality.
- **Timezone-aware display**: Calendar adapts to the user's configured timezone.
- **Visual feedback**: Marked days are indicated by subtle dots and color.
- **Toast notifications**: Provide success/failure feedback for user actions.
- **Performance optimized**: Uses debounced interactions and memoized calculations for responsiveness.
- **Accessibility enhanced**: Includes focus management, ARIA attributes, and keyboard navigation.

## Backend Architecture
- **Feature flag system**: All new functionality is gated by feature flags (e.g., `ff.potato.no_drink_v1`).
- **Dual-table data model**:
    - `click_events`: Append-only audit trail of user actions.
    - `day_marks`: Deduplicated current state with unique constraints.
- **Timezone handling**: Server-side validation uses user's timezone for accurate date range determination.
- **Date validation**: Enforces a backdating window from 2025-01-01 to the current date in the user's timezone.
- **Idempotency**: Prevents duplicate day marks from repeated actions.

## Authentication & Authorization
- **Email/password authentication**: Standard credential-based system.
- **Password hashing**: Secure storage of user credentials.
- **User-scoped data**: All data (day marks, events) is tied to authenticated user accounts.

## Data Storage Design
- **PostgreSQL database**: Relational database utilizing UUID primary keys.
- **Event sourcing pattern**: Combines an immutable event log with a materialized state table.
- **Unique constraints**: Ensures no duplicate day marks per user (`UNIQUE (user_id, date)`).
- **Timezone storage**: User timezone preferences are stored as text (e.g., "America/New_York").
- **Date-only semantics**: Dates stored in YYYY-MM-DD format, independent of time.

## Business Logic Constraints
- **Truth table logic**: Only `true` values are stored for "No Drink" days; absence implies an unknown state.
- **Validation rules**: Server-side enforcement of date boundaries and timezone-aware calculations.

# External Dependencies

## Database
- **PostgreSQL**: Primary data storage.

## Implemented Dependencies
- **Express.js**: Backend web framework for server-side logic and API routing.
- **Drizzle ORM**: Used for PostgreSQL interaction, schema management, and type safety.
- **bcryptjs**: Handles password hashing for secure authentication.
- **React + Vite**: Frontend framework for building the user interface.
- **date-fns**: Provides utilities for date calculations and timezone handling.
- **Zod**: Used for runtime data validation, with integration for Drizzle.

## Feature Flag System
- **Replit Secrets**: Used for managing production feature flags (e.g., `FF_POTATO_NO_DRINK_V1`).