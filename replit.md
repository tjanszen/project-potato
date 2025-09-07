# Overview

This project is a web application designed for tracking "No Drink" days on a calendar. Its primary purpose is to provide a minimalist dashboard where users can easily mark specific dates as alcohol-free. The application is built with a phase-gated development approach, utilizing feature flags to control functionality rollout, and is designed to be extensible for future features like streak tracking. The long-term vision is to support users in maintaining sobriety or reducing alcohol consumption through a simple, intuitive interface, offering tools for self-monitoring and goal achievement.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The UI is calendar-centric, displaying a scrollable monthly calendar limited to 2025. Clicking on a day opens an interactive drawer for marking functionality. The display is timezone-aware based on user settings, and marked days are visually indicated with dots. User feedback is provided via toast notifications. The frontend is performance-optimized with debounced interactions and memoized calculations, and enhanced for accessibility with ARIA attributes and keyboard navigation.

## Backend Architecture
All functionality is gated by a `ff.potato.no_drink_v1` feature flag (default OFF). The data model uses a dual-table approach: an append-only `click_events` log for auditing and a `day_marks` state table with unique constraints to prevent duplicates. Server-side validation handles timezone conversions, enforcing a backdating window from 2025-01-01 to the user's current date. Operations are idempotent, ensuring multiple clicks on the same day result in no change.

## Authentication & Authorization
The system uses a simple email/password authentication mechanism with secure password hashing. All day marks and events are scoped to authenticated user accounts.

## Data Storage Design
Data is stored in a PostgreSQL database, utilizing UUID primary keys. It follows an event sourcing pattern, combining an immutable event log with a materialized state table. Unique constraints (`UNIQUE (user_id, date)`) prevent duplicate day marks. User timezone preferences are stored as text (e.g., "America/New_York"), and dates are stored in YYYY-MM-DD format, independent of time.

## Business Logic Constraints
The system only stores `true` values for "No Drink" days; the absence of an entry signifies an unknown state. The data model is designed for future extensibility to include `false` values (for "Did Drink") with last-write-wins semantics. Server-side validation enforces date boundaries and timezone-aware current date calculations.

## Technical Implementations
The application utilizes Express.js for the backend, Drizzle ORM for database interaction, bcryptjs for password hashing, and React with Vite for the frontend. date-fns is used for timezone handling and date calculations, and Zod for runtime validation.

# External Dependencies

## Database
- **PostgreSQL**: Primary data storage, supporting UUID v4 for primary keys.

## Implemented Dependencies
- **Express.js**: Backend web framework, including CORS and session middleware.
- **Drizzle ORM**: For PostgreSQL interaction, schema management, and type safety.
- **bcryptjs**: For password hashing.
- **React + Vite**: Frontend framework.
- **date-fns**: For timezone handling and date calculations.
- **Zod**: For runtime validation, integrated with Drizzle.

## Feature Flag System
- Custom feature toggle infrastructure supporting `ff.potato.no_drink_v1` and future feature gates.