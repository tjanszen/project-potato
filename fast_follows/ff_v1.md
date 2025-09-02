1. Session Expiration Policy

Clarify and standardize default session lifetime.

Add optional "Remember me" longer sessions.

2. Logout Endpoint

Add /api/auth/logout to destroy sessions.

Prevents abandoned or stolen sessions from lingering.

3. Password Reset / Recovery

Implement "Forgot Password" flow using email tokens or admin reset.

Critical for real-world use.

4. Rate Limiting / Brute Force Protection

Add middleware to limit repeated login attempts.

Optionally lock accounts temporarily after too many failed attempts.

5. Session Store Backend

Move from in-memory store → Redis or PostgreSQL session store.

Ensures persistence across restarts, scales for production.

6. Email Verification

Add email confirmation step before granting full access.