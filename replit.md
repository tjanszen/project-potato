# Overview

This project is a web application for tracking "No Drink" days using a calendar-centric interface. Its primary purpose is to allow users to easily mark and view alcohol-free days. The application is built with a focus on core functionality first, using feature flags for phased development and to enable future enhancements like streak tracking and badges. The business vision is to provide a simple, intuitive tool for personal habit tracking, with potential for growth into a broader wellness application.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Calendar-centric UI**: A single dashboard features a scrollable monthly calendar for 2025.
- **Interactive Drawer System**: Clicking on calendar days opens a drawer for marking functionality.
- **Timezone-aware Display**: Dates are shown according to the user's configured timezone.
- **Visual Feedback**: Marked days are indicated with subtle filled dots and color.
- **Toast Notifications**: Provides success/failure feedback for user actions.
- **Performance Optimized**: Utilizes debounced interactions and memoized calculations for responsiveness.
- **Accessibility Enhanced**: Includes focus management, ARIA attributes, and keyboard navigation.

## Backend Architecture
- **Feature Flag System**: All new functionality is gated by `ff.potato.no_drink_v1` (default OFF) for controlled rollouts.
- **Dual-table Data Model**: Combines an append-only `click_events` log for audit trails and a `day_marks` state table with unique constraints for deduplicated current state.
- **Timezone Handling**: Server-side validation uses the user's timezone to determine valid date ranges.
- **Date Validation**: Enforces a backdating window from 2025-01-01 to the current date in the user's timezone.
- **Idempotency**: Multiple clicks on the same day result in no-op operations to prevent duplicate entries.

## Authentication & Authorization
- **Email/Password Authentication**: Simple credential-based system with secure password hashing using bcrypt.
- **User-scoped Data**: All day marks and events are tied to authenticated user accounts.

## Data Storage Design
- **PostgreSQL Database**: Relational database utilizing UUID primary keys.
- **Event Sourcing Pattern**: Combines an immutable event log with a materialized state table.
- **Unique Constraints**: `UNIQUE (user_id, date)` constraint prevents duplicate day marks.
- **Timezone Storage**: User timezone preference stored as text (e.g., "America/New_York").
- **Date-only Semantics**: Days are stored in YYYY-MM-DD format, independent of time.

## Business Logic Constraints
- **Truth Table Logic**: Only `true` values are stored for "No Drink" days; absence indicates an unknown state.
- **Future Extensibility**: Data model is designed to accommodate `false` values for "Did Drink" with last-write-wins semantics.
- **Validation Rules**: Server-side enforcement of date boundaries and timezone-aware current date calculations.

# External Dependencies

## Database
- **PostgreSQL**: Primary data storage, supporting UUID v4 for primary keys.

## Implemented Dependencies
- **Express.js**: Backend web framework used for routing, CORS, and session management.
- **Drizzle ORM**: Used for PostgreSQL interaction, schema management, and type safety.
- **bcryptjs**: For secure password hashing.
- **React + Vite**: Frontend framework for building the user interface.
- **date-fns**: Utilized for timezone handling and date calculations.
- **Zod**: For runtime validation, integrated with Drizzle ORM.

## Feature Flag System
- **Custom Feature Toggle Infrastructure**: Essential for managing `ff.potato.no_drink_v1` and future feature gates.