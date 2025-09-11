# Bugs Journal



### 2025-09-01 Deployment Configuration Missing - RESOLVED ✅
**Symptom:** Replit deployment fails with "application is failing health checks because the run command is misconfigured and not starting a proper web server"  
**Root Cause:** Missing run command in .replit file deployment section, missing index.js entry point file to match package.json main field  

**Fix Details:**
1. **Created `/index.js` entry point file:**
   ```javascript
   // Main entry point for Project Potato deployment
   // This file is referenced by package.json "main" field
   // It simply starts the server.js file which contains the working Express server
   require('./server.js');
   ```
2. **Added run command to `.replit` file in [deployment] section:**
   ```toml
   run = "node index.js"
   ```
3. **Verified existing server.js already had proper configuration:**
   - Root endpoint (`/`) returning HTTP 200 ✅
   - Health check endpoint (`/health`) with JSON response ✅  
   - Proper host binding (`0.0.0.0:3000`) ✅

**Files Modified:**
- `index.js` (created)
- `.replit` (deployment run command added by user)

**Evidence:** Deployment succeeded after adding run command, server starts correctly with health checks passing, application accessible at production URL  
**Follow-ups:** Phase 0 deployment readiness now validated - ready for Phase 1 development when approved  
**Resolution Date:** 2025-09-01

### [2025-09-03] Authentication & Server Entry Point Issues - RESOLVED ✅
**Symptom:** Phase 4A authentication implementation failing with multiple issues: logout endpoint returning "Cannot POST /api/auth/logout" 404 errors, server crashes with exit code 7 on startup, and frontend signup returning "Feature not available" message blocking all authentication functionality  
**Root Cause:** Multiple architectural confusion issues: (1) Added logout routes to `server/index.ts` TypeScript file instead of runtime `index.js` file, (2) Duplicate feature flag middleware applied both globally on `/api/auth` and individually on logout route causing conflicts, (3) Multiple duplicate logout routes defined (`/api/auth/logout` and test `/api/logout`), (4) Feature flag `ff.potato.no_drink_v1` defaulted to OFF state blocking all auth endpoints

**Fix Details:**
1. **Identified correct runtime entry point:**
   - Confirmed `package.json` main field points to `index.js`, not `server/index.ts`
   - All route additions must go in `index.js` for actual execution
2. **Added logout endpoint to correct file:**
   ```javascript
   // Logout endpoint (Phase 4A) - placed right after login
   app.post('/api/auth/logout', async (req, res) => {
     // Check authentication manually
     if (!req.session.userId) {
       return res.status(401).json({ error: 'Authentication required' });
     }
     // Session destroy logic with cookie cleanup
   });
   ```
3. **Removed duplicate middleware and routes:**
   - Removed individual `requireFeatureFlag('ff.potato.no_drink_v1')` from logout route (already covered by global `/api/auth` middleware)
   - Deleted duplicate test `/api/logout` route
   - Cleaned up conflicting route definitions
4. **Enabled feature flag for testing:**
   ```bash
   curl -X POST http://localhost:3000/api/admin/toggle-flag/ff.potato.no_drink_v1
   ```

**Files Modified:**
- `index.js` (added logout endpoint after login route, removed duplicates)
- `docs/agent_memory/decisions.adrs.md` (added ADR for canonical server entry point)
- `docs/agent_memory/playbooks.md` (added server entry point confusion playbook)

**Evidence:** Server starts cleanly without crashes, curl logout test returns `{"message": "Logout successful"}`, frontend authentication flow works end-to-end with signup/login/logout, feature flag toggle enables all auth endpoints successfully  
**Follow-ups:** Created ADR "Canonical Server Entry Point" and playbook "Server Entry Point Confusion" to prevent future developers from editing non-runtime files, established `index.js` as single source of truth for backend routes  
**Resolution Date:** 2025-09-03

### [2025-09-03] Calendar Error Handling Enhancement - RESOLVED ✅
**Symptom:** Calendar API errors only logged to console.error, providing no user feedback when data loading failed, authentication expired, or network issues occurred during month navigation  
**Root Cause:** Missing error state management in CalendarGrid component - API errors were caught but only logged, not displayed to users  

**Fix Details:**
1. **Added error state management:**
   ```typescript
   const [error, setError] = useState<string | null>(null)
   ```
2. **Enhanced API error handling with user-friendly messages:**
   ```typescript
   if (response.error) {
     const errorMessage = response.error === 'Authentication required' 
       ? 'Please log in to view your calendar data.'
       : `Failed to load calendar: ${response.error}`
     setError(errorMessage)
   }
   ```
3. **Added network error handling:**
   ```typescript
   } catch (error) {
     setError('Unable to connect to server. Please check your connection and try again.')
   }
   ```
4. **Implemented error UI display:**
   ```jsx
   {error && <div className="error-message" data-testid="error-calendar">{error}</div>}
   ```

**Files Modified:**
- `client/src/components/CalendarGrid.tsx` (added error state, enhanced error handling, error display UI)

**Evidence:** Calendar now displays user-friendly error messages for authentication failures, network issues, and server errors instead of silent failures with console-only logging  
**Follow-ups:** No further action needed - error handling now provides proper user experience  
**Resolution Date:** 2025-09-03

### [2025-09-06] V2 Endpoints & Storage Missing - RESOLVED ✅
**Symptom:** During Phase 6E cutover, /api/v2/runs, /api/v2/totals, and /health/runs endpoints returned "connection refused" and storage.ts had multiple missing method errors.  
**Root Cause:** V2 system was documented but never actually implemented in code. Additionally, the lack of a stop/summarize protocol caused the Replit agent to continue running for 11 minutes while encountering repeated errors. This led to wasted compute and unclear progress for the operator.  
**Fix Details:**
- Implemented missing endpoints in server/index.ts
- Extended feature flag registry with ff.potato.runs_v2
- Added storage methods: getRunsForUser, getTotalsForUser, etc.
- Simplified Drizzle queries and resolved TypeScript mismatches
- Stabilized server after multiple restarts  
**Evidence:** Endpoints now return data with flag enabled, database integrity validated, TypeScript compilation passes with only minor diagnostics.  
**Follow-ups:** Added Phase 6X to v2.md to ensure endpoint/storage work is phased in before future cutovers. Added Error Handling Clause and ADR-2025-09-06 "Mid-Phase Error Handling Standard" to require agents to stop, summarize, and recommend next steps instead of running indefinitely when encountering major issues. See ADR-2025-09-06 for full context and policy details.  
**Resolution Date:** 2025-09-06

**Follow-up (2025-09-07):**  
Issue resolved through Phase 6X (endpoint integration + validation) and Phase 6E-Lite re-run.  
Cutover completed successfully with feature flag ff.potato.runs_v2 set to default ON.  
Cross-reference: imp_plans/v2.md Phase 6E-Lite (✅ COMPLETE).

### [2025-09-07] Phase 6X Validation Blocked by Authentication
**Issue:** Initial validation of /api/v2/runs and /api/v2/totals failed with "connection refused" symptoms, later confirmed to be 401 Unauthorized responses due to missing authentication.  
**Root Cause:** Endpoints were correctly gated by requireAuthentication middleware. Test requests were unauthenticated, leading to false assumption of server instability.  
**Resolution:** Added test user creation/login step and session cookie handling to validation flow. Documented in Phase 6X Exit Criteria, API Validation Checklist, and ADR-2025-09-07.  
**Status:** Resolved ✅  
**Cross-Reference:** ADR-2025-09-07 Authenticated Endpoint Validation; imp_plans/v2.md Phase 6X Exit Criteria

### [2025-09-08] "500 Internal Server Error when marking days" - RESOLVED ✅

Date: 2025-09-08  
Bug: "500 Internal Server Error when marking days"  

Original Diagnosis:  
- Suspected missing day_marks table.  
- Later suspected server crash after startup.  

Corrected Diagnosis (2025-09-10):  
- ❌ Table not missing → day_marks table exists.  
- ❌ Server not crashing → process starts, initializes cleanly, and stays alive.  
- ✅ Root cause: Replit platform environment limitation.  
  - Background processes (nohup node index.js &) are killed immediately in this environment.  
  - Without a persistent server, curl health checks and API requests fail with 502 Bad Gateway from Replit's proxy.  
- ✅ Application code, schema initialization, and PORT handling are all correct.  

Evidence:  
- Debug logs show complete server initialization and "Server listening on port 3000."  
- .replit file maps localPort=3000 → externalPort=80 correctly.  
- Internal curl works only when server is run in foreground mode.  
- External curl always fails in agent tests, because process is killed.  

Final Conclusion:  
- The September 8th error was a Replit deployment/platform issue, not an application bug.  
- Resolution path is environmental:  
  - Run server via Replit Workflows/Deployments (managed execution).  
  - Never background processes manually in Replit.  

Status: Closed as environment misconfiguration.  

Follow-up:  
- Playbook updated: "Always run servers via Replit Deploy/Workflows, never use manual background processes."  

---

### [2025-09-08] Doc Sprawl in agent_memory

**Issue:** Phase-specific artifacts (completion reports, operator playbooks) were placed inside `docs/agent_memory/`, mixing long-term memory with temporary evidence.  
**Root Cause:** No enforced rule distinguishing persistent memory vs artifacts.  
**Resolution:** Introduced dedicated `docs/phase_artifacts/` folder. Moved all phase-specific files there. Added File Organization Rule to `playbooks.md`.  
**Status:** Resolved ✅  
**Cross-Reference:** Playbooks → File Organization Rule

---

### [2025-09-10] Reserved VM Deployment Database Conflict

**Bug:** Both development and Reserved VM deployments fail with "Internal server error" on login and calendar endpoints.

**Context:**
- Development environment was previously functional against Neon DB at `ep-spring-salad-aelsxv77.c-2.us-east-2.aws.neon.tech`.
- After schema patch and multiple DB connection attempts, both dev and Reserved VM environments now fail consistently:
  - Login → 500 error
  - Calendar → "Failed to load calendar: Internal server error"
- Issue appears tied to database connection misconfiguration and environment variable overrides.

**Findings:**
1. **Database Host Mismatch**
   - Dev DB host (expected): `ep-spring-salad...`
   - Reserved VM DB host (observed in logs): `ep-muddy-base...` (fresh DB, missing V2 tables)
   - Confirms that different environments are pointing at different Neon instances.

2. **Environment Variable Override**
   - Reserved VM contained stale `PG*` variables (`PGHOST`, `PGUSER`, `PGPASSWORD`, etc.) from an old Neon integration.
   - Node.js client prefers `PG*` vars over `DATABASE_URL`, causing misrouting even after `DATABASE_URL` was updated.

3. **Attempted Fixes**
   - Updated `DATABASE_URL` in both project and deployment secrets → ❌ overridden.
   - Removed `PG*` variables → ❌ errors persisted.
   - Removed "Production Database" integration → ❌ no change.
   - Synced credentials from dev → ❌ authentication still failed.
   - Result: both dev and Reserved VM fail to connect to correct DB.

4. **Error Patterns**
   - `/api/*` endpoints → 500 Internal Server Error.
   - Login fails with "Internal server error".
   - Calendar fails to load with "Internal server error".
   - Logs show database authentication/connection issues.

**Root Cause:**
- **Database integration conflict**: Reserved VM and dev environments both polluted with stale Neon DB credentials.
- `PG*` and/or `NEON_*` variables override `DATABASE_URL`, forcing connections to the wrong DB instance (`muddy-base`).
- This breaks both development and production deployments.

**Status:**
- ❌ Reserved VM deployment: **Broken**
- ❌ Development environment: **Broken**
- Schema fix (`date → local_date`): ✅ Completed
- Documentation (Bug Journal, Playbooks, Patch Plan): ✅ Updated
- Production deployment: 🚨 **Critical blocker** — app cannot be used.

**Next Steps:**
1. **Purge environment variable conflicts** in both dev and Reserved VM:
   - Delete all `PG*` and `NEON_*` variables.
   - Keep only `DATABASE_URL` (pointing to `spring-salad`) and `SESSION_SECRET`.
2. **Confirm runtime environment variables** with `printenv` to ensure only `DATABASE_URL` is active.
3. Redeploy Reserved VM and restart dev environment.
4. Validate `/health`, `/api/login`, `/api/calendar`, and day marking endpoints.
5. If issues persist → escalate with Replit support for environment isolation.

**Lessons Learned:**
- PostgreSQL drivers prioritize `PG*` over `DATABASE_URL`.
- Replit Neon integration can override secrets invisibly.
- Conflicts can spread across dev and prod if environment is not purged carefully.
- Always verify runtime env (`printenv`) to confirm effective DB configuration.

---

## 2025-09-11 — Calendar & Mark Day Schema + Logic Bugs

### Bug
- Calendar API (`/api/calendar`) failed with HTTP 500.
- Mark Day API (`/api/days/:date/no-drink`) failed with HTTP 500.

### Context
- Both endpoints were failing in development and Reserved VM.
- Prior diagnosis blamed infra/deployment, but systematic investigation revealed schema mapping issues in code.
- Additional logic bug found in Mark Day endpoint (variable scope issue).

### Findings
1. **Calendar API**
   - SQL generated with missing column names (`and >= $3 and < $4`).
   - Query selected `"date"` instead of `"local_date"`.
   - Root cause: Drizzle schema + storage code mismatch.

2. **Mark Day API**
   - **Field Mapping Bug**: Insert attempted with `date` instead of `localDate`.  
     - Drizzle mapped `date` → null, violating NOT NULL constraint on `local_date`.  
     - Fixed by renaming field in insertion object.
   - **Variable Scoping Bug**: `totalsInvalidation` referenced outside of its scope.  
     - Declared inside try/catch but used at line ~811.  
     - Fixed by hoisting `totalsInvalidation` declaration to outer scope.

### Root Cause
- Codebase referenced outdated schema (`date` instead of `localDate`).
- Logic error caused undefined variable at runtime.

### Resolution
- Calendar: Updated `shared/schema.js` and storage code to use `localDate` consistently.
- Mark Day:
  - Fixed insertion object to `{ localDate: req.params.date }`.
  - Hoisted `totalsInvalidation` variable declaration to outer scope.
- Both APIs now return HTTP 200/201 and work end-to-end.

### Lessons Learned
- Always align DB schema, Drizzle schema, and storage code before endpoint testing.
- Schema mismatches cause SQL errors (calendar) or constraint violations (mark day).
- Undefined variables from scope issues can hide behind primary failures — must check logs carefully.
- Infra/deployment was not the issue — systematic 3-phase investigation isolated the true cause.

---

### {{YYYY-MM-DD}} <Short Title>
**Symptom:**  
**Root Cause:**  
**Fix:**  
**Evidence:** <tests/logs/queries>  
**Follow-ups:** <action items, if any>