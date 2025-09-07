# Overview

This project is a web application designed for tracking "No Drink" days on a calendar. It provides a minimal dashboard where users can mark specific calendar days as alcohol-free. The application is built with a focus on core functionality first, using feature flags to manage phased development and allow for future expansion, such as streak tracking and badges. The business vision is to provide a simple, effective tool for personal habit tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The user interface is calendar-centric, presenting a single dashboard view with a scrollable monthly calendar. Users interact by clicking days to open an interactive drawer for marking. The display is timezone-aware, showing dates according to the user's configured timezone. Visual feedback includes subtle filled dots for marked days and toast notifications for user actions. The frontend is performance-optimized with debounced interactions and memoized calculations and enhanced for accessibility with ARIA attributes and keyboard navigation.

## Backend Architecture
All functionality is gated behind a feature flag system (`ff.potato.no_drink_v1`). The data model uses a dual-table approach: an append-only `click_events` log for auditing and a `day_marks` state table with unique constraints for deduplicated current state. Server-side timezone handling ensures accurate date validation based on the user's timezone, enforcing a backdating window from 2025-01-01 to the current date. Idempotency is built-in, preventing duplicate day marks from multiple clicks.

## Authentication & Authorization
The system uses a simple email/password authentication mechanism with secure password hashing. All day marks and events are user-scoped, tied to authenticated user accounts.

## Data Storage Design
The primary data storage is a PostgreSQL database utilizing UUID primary keys. It employs an event sourcing pattern combining an immutable event log with a materialized state table. Unique constraints (`UNIQUE (user_id, date)`) prevent duplicate day marks. User timezone preferences are stored as text (e.g., "America/New_York"), and dates are stored in YYYY-MM-DD format, independent of time.

## Business Logic Constraints
The system primarily stores `true` values for "No Drink" days, with the absence of a mark indicating an unknown state. The data model is designed for future extensibility to accommodate "Did Drink" values with last-write-wins semantics. Server-side validation enforces date boundaries and timezone-aware current date calculations.

# External Dependencies

## Database
- **PostgreSQL**: Used for primary data storage.

## Implemented Dependencies
- **Express.js**: Backend web framework, including CORS and session middleware.
- **Drizzle ORM**: For PostgreSQL interaction, schema management, and type safety.
- **bcryptjs**: For password hashing.
- **React + Vite**: Frontend framework.
- **date-fns**: For timezone handling and date calculations.
- **Zod**: For runtime validation, integrated with Drizzle ORM.

## Feature Flag System
- A custom feature toggle infrastructure is in place to manage the `ff.potato.no_drink_v1` flag and future feature gates.