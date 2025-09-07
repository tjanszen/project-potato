# Overview

This project is a habit tracking web application focused on allowing users to mark calendar days as "No Drink". It features a minimal dashboard with an interactive calendar interface. The application is developed using a phase-gated approach with feature flags, prioritizing core functionality while allowing for future expansions like streak tracking and badges. The business vision is to provide a simple, effective tool for individuals monitoring their alcohol consumption, with potential for broader habit tracking applications.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **UI/UX**: Calendar-centric dashboard, interactive drawer for day marking, timezone-aware date display, visual feedback for marked days, toast notifications.
- **Performance**: Debounced interactions, memoized calculations using React.memo and useMemo for responsiveness.
- **Accessibility**: Focus management, ARIA attributes, keyboard navigation.
- **Technology**: React with Vite.

## Backend Architecture
- **Feature Flags**: All new functionality is gated behind feature flags (e.g., `ff.potato.no_drink_v1`).
- **Data Model**: Dual-table approach with an append-only event log (`click_events`) and a deduplicated state table (`day_marks`).
- **Timezone Handling**: Server-side validation uses user's timezone for date calculations and validations.
- **Date Validation**: Enforces a backdating window (2025-01-01 to current date) and ensures idempotency for day marking.
- **Technology**: Express.js.

## Authentication & Authorization
- **Authentication**: Email/password-based system with secure password hashing.
- **Authorization**: All data is user-scoped, tied to authenticated accounts.

## Data Storage Design
- **Database**: PostgreSQL with UUID v4 primary keys.
- **Patterns**: Event sourcing pattern combining an immutable event log and a materialized state table.
- **Constraints**: Unique constraints (`UNIQUE (user_id, date)`) prevent duplicate day marks.
- **Data Representation**: User timezone stored as text (e.g., "America/New_York"), dates stored in YYYY-MM-DD format.

## Business Logic
- **Core Logic**: Tracks "No Drink" days; the absence of a mark indicates an unknown state, not "Did Drink".
- **Validation**: Server-side enforcement of date boundaries and timezone-aware current date calculations.

## Technical Implementations
- **TypeScript**: Used for type safety across server-side code.
- **Drizzle ORM**: Used for database interaction and schema management.
- **Zod**: For runtime validation, integrated with Drizzle-zod.
- **Date-fns**: For robust date and timezone calculations.

# External Dependencies

## Database
- **PostgreSQL**: Primary data store.

## Implemented Dependencies
- **Express.js**: Web application framework.
- **Drizzle ORM**: ORM for PostgreSQL interaction.
- **bcryptjs**: Password hashing library.
- **React**: Frontend library.
- **Vite**: Frontend build tool.
- **date-fns**: Date utility library.
- **Zod**: Schema validation library.

## Feature Flag System
- **Replit Secrets**: Used for managing feature flag configurations in production.