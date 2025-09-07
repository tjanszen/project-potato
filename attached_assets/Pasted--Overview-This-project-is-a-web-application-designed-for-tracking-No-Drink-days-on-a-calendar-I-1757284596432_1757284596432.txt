# Overview

This project is a web application designed for tracking "No Drink" days on a calendar. Its core purpose is to provide a minimalist dashboard where users can easily mark specific days as alcohol-free. The application is built with a focus on phase-gated development using feature flags, enabling a staged rollout of functionalities, starting with core marking capabilities and allowing for future expansions like streak tracking and badges. The business vision is to provide a simple, effective tool for personal habit tracking, with market potential in the health and wellness sector for individuals seeking to monitor and reduce alcohol consumption.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Calendar-centric UI**: A single dashboard view featuring a scrollable monthly calendar, currently limited to 2025.
- **Interactive Drawer System**: Clicking on calendar days activates a sliding drawer for marking and interaction.
- **Timezone-aware Display**: Calendar dates are displayed according to the user's configured timezone.
- **Visual Feedback**: Marked days are indicated with subtle filled dots and color coding.
- **Toast Notifications**: Provides immediate success or failure feedback for user actions.
- **Performance Optimization**: Employs debouncing for interactions and memoization for calculations to ensure responsiveness.
- **Accessibility Enhancement**: Includes focus management, ARIA attributes, and keyboard navigation support for improved usability.

## Backend Architecture
- **Feature Flag System**: All functionalities are controlled by a `ff.potato.no_drink_v1` flag (default OFF) to enable phased rollouts.
- **Dual-Table Data Model**: Utilizes an event log (`click_events`) for append-only audit trails and a state table (`day_marks`) for deduplicated current states with unique constraints.
- **Timezone Handling**: Server-side validation leverages the user's timezone for accurate date range determination.
- **Date Validation**: Enforces a backdating window from 2025-01-01 to the current date in the user's timezone.
- **Idempotency**: Designed such that multiple clicks on the same day result in no operational change, preventing duplicates.

## Authentication & Authorization
- **Email/Password Authentication**: A straightforward credential-based authentication system.
- **Password Hashing**: Secure storage of user credentials using hashing.
- **User-Scoped Data**: All day marks and events are intrinsically linked to authenticated user accounts.

## Data Storage Design
- **PostgreSQL Database**: Serves as the primary data store, utilizing UUID primary keys.
- **Event Sourcing Pattern**: Combines an immutable event log with a materialized state table for data management.
- **Unique Constraints**: Ensures no duplicate day marks per user through `UNIQUE (user_id, date)` constraints.
- **Timezone Storage**: User timezone preferences are stored as text (e.g., "America/New_York").
- **Date-Only Semantics**: Days are stored in YYYY-MM-DD format, independent of time.

## Business Logic Constraints
- **Truth Table Logic**: The system only stores `true` values for "No Drink" days; the absence of an entry implies an unknown state.
- **Future Extensibility**: The data model is designed to easily accommodate `false` values for "Did Drink" in the future, with a last-write-wins approach.
- **Validation Rules**: Server-side enforcement for date boundaries and timezone-aware current date calculations.

# External Dependencies

- **PostgreSQL**: Used as the primary relational database for data storage.
- **Express.js**: The chosen backend web framework, handling routing, CORS, and session management.
- **Drizzle ORM**: Utilized for interacting with PostgreSQL, managing schema, and ensuring type safety.
- **bcryptjs**: Employed for secure password hashing.
- **React + Vite**: The frontend framework and build tool combination.
- **date-fns**: A library for comprehensive date and time operations, including timezone handling.
- **Zod**: Used for runtime validation, integrated with Drizzle-Zod.
- **Feature Toggle Infrastructure**: A required system to manage and control feature flags like `ff.potato.no_drink_v1`.