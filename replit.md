# Overview

This project is a minimalist web application for tracking "No Drink" days on a calendar. Its core purpose is to provide a simple, interactive dashboard where users can easily mark specific days as alcohol-free. The development follows a phase-gated approach using feature flags, ensuring core functionality is stable before expanding to features like streak tracking or badges. The application is designed for scalability and maintains flexibility for future enhancements.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Calendar-centric UI**: Single dashboard view with a scrollable monthly calendar limited to 2025.
- **Interactive Drawer System**: Clicking calendar days opens a drawer for marking functionality.
- **Timezone-aware Display**: Calendar shows dates based on the user's configured timezone.
- **Visual Feedback**: Marked days are indicated with subtle filled dots and color.
- **Toast Notifications**: Provide success/failure feedback for user actions.
- **Performance Optimized**: Features debounced interactions and memoized calculations for responsiveness.
- **Accessibility Enhanced**: Includes focus management, ARIA attributes, and keyboard navigation support.

## Backend Architecture
- **Feature Flag System**: All functionality is gated behind a `ff.potato.no_drink_v1` flag (default OFF).
- **Dual-table Data Model**: Uses an event log (`click_events`) for an append-only audit trail and a state table (`day_marks`) for deduplicated current state with unique constraints.
- **Timezone Handling**: Server-side validation uses the user's timezone setting for date range determination.
- **Date Validation**: Enforces a backdating window from 2025-01-01 to the current date in the user's timezone.
- **Idempotency**: Multiple clicks on the same day result in no-op operations.

## Authentication & Authorization
- **Email/Password Authentication**: Simple credential-based authentication system.
- **Password Hashing**: Secure storage of user credentials.
- **User-scoped Data**: All day marks and events are tied to authenticated user accounts.

## Data Storage Design
- **PostgreSQL Database**: Relational database utilizing UUID primary keys.
- **Event Sourcing Pattern**: Combines an immutable event log with a materialized state table.
- **Unique Constraints**: Prevents duplicate day marks per user using `UNIQUE (user_id, date)`.
- **Timezone Storage**: User timezone preference stored as text (e.g., "America/New_York").
- **Date-only Semantics**: Days are stored in YYYY-MM-DD format, independent of time.

## Business Logic Constraints
- **Truth Table Logic**: Only stores `true` values for "No Drink"; absence represents an unknown state.
- **Future Extensibility**: Data model designed to accommodate `false` values for "Did Drink" with last-write-wins semantics.
- **Validation Rules**: Server-side enforcement of date boundaries and timezone-aware current date calculations.

# External Dependencies

## Database
- **PostgreSQL**: Primary data storage, supporting UUID v4 for primary keys.

## Implemented Dependencies
- **Express.js**: Backend web framework used for routing, CORS, and session management.
- **Drizzle ORM**: For PostgreSQL interaction, schema management, and type safety.
- **bcryptjs**: Used for secure password hashing.
- **React + Vite**: Frontend framework for building the user interface.
- **date-fns**: For robust timezone handling and date calculations.
- **Zod**: Runtime validation with integration for Drizzle.

## Feature Flag System
- **Feature Toggle Infrastructure**: Essential for managing the `ff.potato.no_drink_v1` flag and future feature gates.