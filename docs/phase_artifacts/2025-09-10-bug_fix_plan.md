# Bug Fix Plan — 2025-09-10
**Issue:** "Internal server error" on login and calendar endpoints (dev + Reserved VM).

## Step 1: Confirm Database Target
- Run: echo $DATABASE_URL
- Confirm host matches `ep-spring-salad` (correct DB).
- If mismatch, purge all `PG*` and `NEON_*` variables so only `DATABASE_URL` remains active.

## Step 2: Full Schema Audit
- Run schema check across: `users`, `day_marks`, `runs`, `run_totals`.
- Use `\d+ table_name` or `information_schema` query.
- Confirm column names against `shared/schema.ts`.

## Step 3: Apply Schema Fixes with Rollback Paths
- For each mismatch:
  - Provide ALTER TABLE fix.
  - Provide rollback SQL.
- Examples:
  ALTER TABLE day_marks RENAME COLUMN date TO local_date;
  ALTER TABLE users RENAME COLUMN password TO password_hash;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

- Rollback examples:
  ALTER TABLE day_marks RENAME COLUMN local_date TO date;
  ALTER TABLE users RENAME COLUMN password_hash TO password;
  ALTER TABLE users DROP COLUMN timezone;

## Step 4: Authentication Tests
- Sign up a new test user → expect HTTP 200.
- Log in with the new user → expect HTTP 200.

## Step 5: Calendar & Day Marking Tests
- POST /api/days/:date/no-drink → expect HTTP 200 + DB row inserted.
- GET /api/calendar?month=2025-09 → expect HTTP 200 + populated `markedDates`.

## Step 6: Feature Flag Verification
- GET /api/feature-flags/ff.potato.no_drink_v1
- Expected: true

## Step 7: Bug Journal Update
- Append results + schema fixes to docs/agent_memory/bugs_journal.md (date: 2025-09-10).