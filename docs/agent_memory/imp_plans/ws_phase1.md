# 📋 Phase 1: Detailed Implementation Steps

## Step 1: Investigate Current Feature Flag System
**Objective:** Understand how existing feature flags are implemented  

**Actions:**
- Examine existing feature flag implementation:  
  - Read `server/feature-flags.js` to understand current system  
  - Check how flags like `ff.potato.no_drink_v1` are defined and accessed  
  - Identify environment variable naming pattern (likely `FF_POTATO_*`)  
- Verify current flag access pattern:  
  - Check how environment variables are loaded in startup scripts  
  - Confirm whether flags are available in bash environment or only in Node.js  

---

## Step 2: Add New Feature Flag
**Objective** Register `ff.potato.workflow_stabilization_v1` in the system using Node.js-based approach  

---

## Revised Actions  

### 2.1 Add Flag Definition to Feature Flag Service  
- **Add to registry:** Add `ff.potato.workflow_stabilization_v1` to the `featureFlags` object in `server/feature-flags.js` (around line 27)  
- **Set default value:** `enabled: false` (OFF)  
- **Add description:** Clear description for the workflow stabilization feature  
- **Follow naming convention:** Use existing pattern from other flags  

---

### 2.2 Add Environment Variable Hydration  
- **Add env var loading:** Add `FF_WORKFLOW_STABILIZATION_V1` hydration in constructor (around line 41)  
- **Use existing normalize function:** Apply the same `normalize()` function for consistent behavior  
- **Add to `getAllFlags` method:** Include in the `getAllFlags()` return object for API access  

---

### 2.3 Verify Node.js Environment Variable Accessibility  
- **Test flag retrieval in Node.js:** Confirm `process.env.FF_WORKFLOW_STABILIZATION_V1` is accessible  
- **Verify service methods work:** Test `featureFlagService.isEnabled('ff.potato.workflow_stabilization_v1')`  
- **Check API endpoints:** Ensure flag appears in `/api/feature-flags` endpoint  
- **Validate normalization:** Test that `"true"`, `"True"`, `"1"` all enable the flag  

---

### 2.4 Update Startup Logic Approach  
- **Abandon bash flag logic:** Remove requirement for bash script access to feature flags  
- **Plan Node.js conditional logic:** Prepare for feature flag checks within `index.js` startup sequence  
- **Align with existing pattern:** Follow the same approach used by other feature flags in the codebase  

---

## Key Changes from Original Step 2  
- **Removed:** "Confirm the flag will be available as `FF_WORKFLOW_STABILIZATION_V1` in bash scripts"  
- **Removed:** "Test flag retrieval in both Node.js and shell environments"  
- **Added:** Focus on Node.js-only approach following existing architecture  
- **Added:** Preparation for startup logic changes in later steps  

---

## Expected Outcome  
- New feature flag properly registered and accessible via Node.js  
- Flag appears in admin endpoints and can be toggled  
- Foundation ready for Node.js-based conditional startup logic in subsequent phases  
- No bash environment variable complexity to manage  

---

## Step 3: Create Backup and Document Baseline
**Objective:** Preserve current working state and document behavior  

**Actions:**
- Create backup of current startup script:  

    cp start_workflow.sh start_workflow.sh.backup

- Document current behavior:  
  - Record current startup sequence and timing  
  - Document what processes start and in what order  
  - Note current working directory and file serving behavior  
  - Capture baseline health check response  

---

## Step 4: Modify Startup Script with Feature Flag
**Objective:** Add feature flag conditional logic while preserving original behavior  

**Actions:**
- Update `start_workflow.sh` with feature flag check:  

    #!/bin/bash
    if [ "$FF_WORKFLOW_STABILIZATION_V1" = "true" ]; then
        echo "🧪 Using experimental workflow stabilization"
        # New logic will go here in subsequent phases
        exec node index.js
    else
        echo "🚀 Starting Project Potato server (original)..."
        exec node index.js
    fi

- Ensure script remains executable:  

    chmod +x start_workflow.sh  

---

## Step 5: Test Feature Flag OFF (Default Behavior)
**Objective:** Verify no regression in current functionality  

**Actions:**
- Ensure flag is OFF (default):  

    unset FF_WORKFLOW_STABILIZATION_V1  
    # OR explicitly set to false  
    export FF_WORKFLOW_STABILIZATION_V1=false  

- Start application and verify:  

    bash start_workflow.sh  

- Verify original behavior:  
  - Confirm `"🚀 Starting Project Potato server (original)..."` message appears  
  - Check application starts normally  
  - Verify `curl localhost:3000/health` returns 200  
  - Test Preview tool accessibility  

---

## Step 6: Test Feature Flag ON (Experimental Mode)
**Objective:** Verify feature flag conditional works but doesn't break anything  

**Actions:**
- Enable feature flag:  

    export FF_WORKFLOW_STABILIZATION_V1=true  

- Start application and verify:  

    bash start_workflow.sh  

- Verify experimental behavior:  
  - Confirm `"🧪 Using experimental workflow stabilization"` message appears  
  - Check application still starts normally (since logic is same for now)  
  - Verify `curl localhost:3000/health` returns 200  
  - Test Preview tool accessibility  

---

## Step 7: Verification and Documentation
**Objective:** Confirm both modes work and document results  

**Actions:**
- Create verification checklist:  
  ✅ Flag OFF: Original startup message and behavior  
  ✅ Flag ON: Experimental message but same functionality  
  ✅ Both modes: Health endpoint responds  
  ✅ Both modes: Preview tool accessible  
  ✅ Both modes: No error messages in startup logs  
- Document baseline metrics:  
  - Startup time in both modes  
  - Process IDs and resource usage  
  - Any differences in log output  
  - Port accessibility and response times  

---

## Step 8: Rollback Testing
**Objective:** Verify rollback mechanism works  

**Actions:**
- Test immediate rollback:  

    export FF_WORKFLOW_STABILIZATION_V1=false  
    # Restart application  

- Test emergency rollback:  

    cp start_workflow.sh.backup start_workflow.sh  
    # Verify original script restored  

---

## ⚠️ Potential Issues and Mitigation
- **Issue 1: Feature Flag Not Available in Bash**  
  - *Mitigation:* Check if flags need to be explicitly exported to shell environment  
  - May need to source environment variables in startup script  
- **Issue 2: Startup Script Permission Issues**  
  - *Mitigation:* Ensure script remains executable after modification  
  - Test script can be run by current user  
- **Issue 3: Environment Variable Conflicts**  
  - *Mitigation:* Verify flag name doesn't conflict with existing environment variables  
  - Test both set/unset scenarios  

---

## 🎯 Success Criteria for Phase 1
- Feature flag toggles cleanly between modes  
- No functional regression when flag is OFF  
- Application starts successfully in both modes  
- Backup and rollback mechanisms verified  
- Baseline behavior documented for future comparison  
