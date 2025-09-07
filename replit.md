# Overview

This project is a web application designed for tracking "No Drink" days on a calendar. It provides a minimal dashboard where users can mark specific days as alcohol-free. The core purpose is to offer a simple, effective tool for habit tracking, with a focus on a clean user interface and robust backend stability. The application is built with phase-gated development, allowing for iterative enhancements like streak tracking and badges in the future, while ensuring core functionality is solid.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Calendar-centric UI**: Single dashboard view with a scrollable monthly calendar (limited to 2025).
- **Interactive Drawer System**: Clicking calendar days opens a drawer for marking functionality.
- **Timezone-aware Display**: Calendar shows dates based on the user's configured timezone.
- **Visual Feedback**: Marked days display with subtle filled dots and color indicators.
- **User Feedback**: Toast notifications for success/failure.
- **Performance Optimized**: Debounced interactions and memoized calculations.
- **Accessibility Enhanced**: Focus management, ARIA attributes, and keyboard navigation support.

## Backend Architecture
- **Feature Flag System**: All functionality is gated behind a `ff.potato.no_drink_v1` flag.
- **Dual-table Data Model**: Uses an event log (`click_events`) for audit trails and a state table (`day_marks`) for deduplicated current state with unique constraints.
- **Timezone Handling**: Server-side validation uses user's timezone for date ranges.
- **Date Validation**: Enforced backdating window from 2025-01-01 to the current date in the user's timezone.
- **Idempotency**: Multiple clicks on the same day result in no-op operations.

## Authentication & Authorization
- **Email/Password Authentication**: Simple credential-based system.
- **Password Hashing**: Secure storage of user credentials using bcrypt.
- **User-scoped Data**: All day marks and events are tied to authenticated user accounts.

## Data Storage Design
- **PostgreSQL Database**: Relational database with UUID primary keys.
- **Event Sourcing Pattern**: Combines an immutable event log with a materialized state table.
- **Unique Constraints**: Prevents duplicate day marks per user via `UNIQUE (user_id, date)`.
- **Timezone Storage**: User timezone preference stored as text (e.g., "America/New_York").
- **Date-only Semantics**: Days stored in YYYY-MM-DD format independent of time.

## Business Logic Constraints
- **Truth Table Logic**: Only stores `true` values for "No Drink" days; absence represents an unknown state.
- **Future Extensibility**: Data model designed to accommodate future `false` values for "Did Drink" with last-write-wins semantics.
- **Validation Rules**: Server-side enforcement of date boundaries and timezone-aware current date calculations.

## Technical Implementations
- Replit auto-deploys on pushes to the `main` branch.
- Application runs via `node index.js` with dynamic PORT binding.
- Production secrets are managed in Replit Secrets.

# External Dependencies

## Database
- **PostgreSQL**: Primary data storage.

## Implemented Dependencies
- **Express.js**: Backend web framework for routing, CORS, and session management.
- **Drizzle ORM**: For PostgreSQL interaction, schema management, and type safety.
- **bcryptjs**: For password hashing.
- **React + Vite**: Frontend framework setup.
- **date-fns**: For timezone handling and date calculations.
- **Zod**: For runtime validation, integrated with Drizzle.
- **Helmet**: For setting security headers (CSP, HSTS, X-Frame-Options).