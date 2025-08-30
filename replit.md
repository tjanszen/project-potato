# Overview

This is a simple habit tracking web application focused on allowing users to mark calendar days as "No Drink". The application features a minimal dashboard with a calendar interface where users can click on days to mark them as alcohol-free. The project is designed with phase-gated development behind feature flags, starting with core functionality and maintaining flexibility for future enhancements like streak tracking and badges.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Calendar-centric UI**: Single dashboard view with a scrollable monthly calendar limited to 2025 only
- **Interactive drawer system**: Clicking calendar days opens a drawer with marking functionality
- **Timezone-aware display**: Calendar shows dates based on user's configured timezone
- **Visual feedback**: Marked days display with subtle filled dots and color indicators
- **Toast notifications**: Success/failure feedback for user actions

## Backend Architecture
- **Feature flag system**: All functionality gated behind `ff.potato.no_drink_v1` flag (default OFF)
- **Dual-table data model**: 
  - Event log (`click_events`) for append-only audit trail of all user actions
  - State table (`day_marks`) for deduplicated current state with unique constraints
- **Timezone handling**: Server-side validation using user's timezone setting to determine valid date ranges
- **Date validation**: Enforced backdating window from 2025-01-01 to current date in user's timezone
- **Idempotency**: Multiple clicks on same day result in no-op operations

## Authentication & Authorization
- **Email/password authentication**: Simple credential-based auth system
- **Password hashing**: Secure storage of user credentials
- **User-scoped data**: All day marks and events tied to authenticated user accounts

## Data Storage Design
- **PostgreSQL database**: Relational database with UUID primary keys
- **Event sourcing pattern**: Combination of immutable event log and materialized state table
- **Unique constraints**: Prevents duplicate day marks per user via `UNIQUE (user_id, date)`
- **Timezone storage**: User timezone preference stored as text (e.g., "America/New_York")
- **Date-only semantics**: Days stored as YYYY-MM-DD format independent of time

## Business Logic Constraints
- **Truth table logic**: Only stores `true` values for "No Drink", absence represents unknown state
- **Future extensibility**: Data model designed to accommodate `false` values for "Did Drink" with last-write-wins semantics
- **Validation rules**: Server-side enforcement of date boundaries and timezone-aware current date calculations

# External Dependencies

## Database
- **PostgreSQL**: Primary data storage with UUID v4 support for primary keys

## Potential Framework Dependencies
- **Web framework**: Will require a modern web framework for frontend calendar rendering and drawer interactions
- **Database ORM/Query builder**: For PostgreSQL interaction and schema management
- **Authentication library**: For password hashing and session management
- **Timezone library**: For accurate timezone handling and date calculations
- **Toast notification system**: For user feedback on successful/failed operations

## Feature Flag System
- **Feature toggle infrastructure**: Required to support the `ff.potato.no_drink_v1` flag and future feature gates