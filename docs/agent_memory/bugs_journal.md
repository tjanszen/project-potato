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

### [2025-09-03] Authentication & Server Entry Point Issues
**Symptom:** Logout endpoint returning "Cannot POST /api/auth/logout" and server crashes with exit code 7  
**Root Cause:** Edited server/index.ts instead of runtime index.js, duplicate routes/middleware, feature flag ff.potato.no_drink_v1 defaulted OFF  
**Fix:** Removed duplicate routes, consolidated logout endpoint in index.js after login route, enabled feature flag via admin toggle  
**Evidence:** curl tests now return {"message": "Logout successful"}, server starts cleanly, auth flow works end-to-end  
**Follow-ups:** Updated ADR and playbook to prevent editing wrong server files in future

### {{YYYY-MM-DD}} <Short Title>
**Symptom:**  
**Root Cause:**  
**Fix:**  
**Evidence:** <tests/logs/queries>  
**Follow-ups:** <action items, if any>