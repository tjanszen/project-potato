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

### [2025-09-07] Phase 6X Validation Blocked by Authentication
**Issue:** Initial validation of /api/v2/runs and /api/v2/totals failed with "connection refused" symptoms, later confirmed to be 401 Unauthorized responses due to missing authentication.  
**Root Cause:** Endpoints were correctly gated by requireAuthentication middleware. Test requests were unauthenticated, leading to false assumption of server instability.  
**Resolution:** Added test user creation/login step and session cookie handling to validation flow. Documented in Phase 6X Exit Criteria, API Validation Checklist, and ADR-2025-09-07.  
**Status:** Resolved ✅  
**Cross-Reference:** ADR-2025-09-07 Authenticated Endpoint Validation; imp_plans/v2.md Phase 6X Exit Criteria

### {{YYYY-MM-DD}} <Short Title>
**Symptom:**  
**Root Cause:**  
**Fix:**  
**Evidence:** <tests/logs/queries>  
**Follow-ups:** <action items, if any>