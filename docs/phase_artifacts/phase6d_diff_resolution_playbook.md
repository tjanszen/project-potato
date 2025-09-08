# Phase 6D Diff Resolution Playbook

## Overview

This playbook provides step-by-step procedures for investigating and fixing discrepancies discovered during shadow read operations between legacy and V2 calculations.

## Quick Reference

### Critical Discrepancies (Production Blockers)
- **Total Days Mismatch**: [Total Days Resolution](#total-days-mismatch)
- **Active Run Status Mismatch**: [Active Run Resolution](#active-run-status-mismatch)
- **Current Run Days Critical Difference**: [Current Run Resolution](#current-run-days-mismatch)

### Non-Critical Discrepancies 
- **Minor Run Count Differences**: [Run Count Resolution](#run-count-mismatch)
- **Longest Run Calculation Differences**: [Longest Run Resolution](#longest-run-mismatch)

## Prerequisites

### Required Access
- Database admin credentials
- Application server access for diff resolution functions
- Shadow monitoring dashboard access
- Alerting system access

### Required Tools
- Shadow calculation functions
- Diff resolution system
- Rebuild utilities
- Golden user validation dataset

## Total Days Mismatch

### Symptoms
- Legacy total days ≠ V2 total days
- Usually indicates missing or extra day_marks in calculation
- Severity: **Critical** (production blocker)

### Investigation Steps

1. **Identify the discrepancy scope**
   ```javascript
   const diffResult = await storage.compareLegacyVsV2Stats(userId);
   console.log(`Legacy: ${diffResult.differences.totalDays?.legacy} days`);
   console.log(`V2: ${diffResult.differences.totalDays?.v2} days`);
   ```

2. **Check raw data integrity**
   ```javascript
   // Count actual day_marks
   const dayMarksCount = await storage.getUserDayMarks(userId);
   console.log(`Day marks in database: ${dayMarksCount.filter(dm => dm.value).length}`);
   
   // Count days from runs table
   const runs = await storage.getUserRuns(userId);
   const v2TotalDays = runs.reduce((sum, run) => sum + run.dayCount, 0);
   console.log(`Days from runs table: ${v2TotalDays}`);
   ```

3. **Identify root cause**
   - Data corruption in runs table
   - Incomplete rebuild operations
   - Race conditions during data updates
   - Algorithm bugs in consecutive date grouping

### Resolution Procedure

```javascript
// Automatic resolution
const resolutionResult = await storage.resolveDiffDiscrepancy(userId, 'totalDays');

if (resolutionResult.resolved) {
  console.log('✅ Total days discrepancy resolved automatically');
  console.log(`Resolution applied: ${resolutionResult.resolutionApplied}`);
} else {
  console.log('❌ Manual investigation required');
  // Proceed to manual resolution steps
}
```

### Manual Resolution Steps

1. **Full rebuild approach**
   ```javascript
   // Backup current state
   const backup = await storage.backupUserRuns(userId);
   
   // Rebuild from day_marks
   const rebuildResult = await storage.rebuildUserRuns(userId);
   
   // Validate resolution
   const postRebuildDiff = await storage.compareLegacyVsV2Stats(userId);
   if (!postRebuildDiff.hasDifferences) {
     console.log('✅ Manual rebuild resolved discrepancy');
   }
   ```

2. **If rebuild fails**
   - Check day_marks data integrity
   - Validate daterange construction logic  
   - Check timezone handling for edge cases
   - Escalate to engineering team

## Active Run Status Mismatch

### Symptoms
- Legacy shows active run = true, V2 shows false (or vice versa)
- Usually timezone-related or "today" calculation issues
- Severity: **Critical** (affects user experience)

### Investigation Steps

1. **Check active run logic**
   ```javascript
   const today = new Date().toISOString().split('T')[0];
   console.log(`Today's date: ${today}`);
   
   const shadowResult = await storage.shadowCalculateUserStats(userId);
   console.log(`Legacy active: ${shadowResult.legacy.activeRun}`);
   console.log(`V2 active: ${shadowResult.v2.activeRun}`);
   console.log(`Legacy last mark: ${shadowResult.legacy.lastMarkDate}`);
   console.log(`V2 last mark: ${shadowResult.v2.lastMarkDate}`);
   ```

2. **Timezone investigation**
   ```javascript
   const user = await storage.getUser(userId);
   console.log(`User timezone: ${user.timezone}`);
   
   // Check if last mark date equals today in user's timezone
   const userToday = new Date().toLocaleString('en-CA', {
     timeZone: user.timezone,
     year: 'numeric',
     month: '2-digit',  
     day: '2-digit'
   }).split(',')[0];
   console.log(`Today in ${user.timezone}: ${userToday}`);
   ```

### Resolution Procedure

```javascript
const resolutionResult = await storage.resolveDiffDiscrepancy(userId, 'activeRun');

if (resolutionResult.resolved) {
  console.log('✅ Active run status synchronized');
} else {
  // Manual timezone adjustment may be required
}
```

## Current Run Days Mismatch

### Symptoms
- Different current run day counts between legacy and V2
- Often related to active run calculation differences
- Severity: **Major** (user-visible stat discrepancy)

### Investigation Steps

1. **Identify active run differences**
   ```javascript
   const runs = await storage.getUserRuns(userId);
   const activeRun = runs.find(run => run.active);
   
   if (activeRun) {
     console.log(`V2 active run: ${activeRun.dayCount} days`);
     console.log(`Run span: ${activeRun.startDate} to ${activeRun.endDate}`);
   } else {
     console.log('No active run in V2 system');
   }
   ```

2. **Check consecutive date calculation**
   ```javascript
   const dayMarks = await storage.getUserDayMarks(userId);
   const recentMarks = dayMarks
     .filter(dm => dm.value)
     .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, 10); // Last 10 marks
   
   console.log('Recent day marks:', recentMarks.map(dm => dm.date));
   ```

### Resolution Procedure

```javascript
const resolutionResult = await storage.resolveDiffDiscrepancy(userId, 'currentRunDays');

// Validate that current run now matches
const postResolutionDiff = await storage.compareLegacyVsV2Stats(userId);
if (!postResolutionDiff.differences.currentRunDays) {
  console.log('✅ Current run days synchronized');
}
```

## Run Count Mismatch

### Symptoms
- Different total run counts between legacy and V2
- Usually caused by run merging algorithm differences
- Severity: **Minor** (doesn't affect core metrics)

### Investigation Steps

1. **Compare run structures**
   ```javascript
   // Legacy run calculation
   const dayMarks = await storage.getUserDayMarks(userId);
   const legacyRuns = storage.groupConsecutiveDates(
     dayMarks.filter(dm => dm.value).map(dm => dm.date)
   );
   
   // V2 runs from database
   const v2Runs = await storage.getUserRuns(userId);
   
   console.log(`Legacy run count: ${legacyRuns.length}`);
   console.log(`V2 run count: ${v2Runs.length}`);
   ```

2. **Identify merge pattern differences**
   ```javascript
   console.log('Legacy runs:');
   legacyRuns.forEach(run => {
     console.log(`  ${run.startDate} to ${run.endDate} (${run.dayCount} days)`);
   });
   
   console.log('V2 runs:');
   v2Runs.forEach(run => {
     console.log(`  ${run.startDate} to ${run.endDate} (${run.dayCount} days)`);
   });
   ```

### Resolution Procedure

- Minor differences in run count are acceptable if total days match
- If total days also differ, treat as critical discrepancy
- Consider algorithm refinement for consistency

## Longest Run Mismatch

### Symptoms  
- Different longest run calculations
- Usually related to run merging or splitting logic
- Severity: **Minor** (statistical discrepancy only)

### Investigation Steps

1. **Compare longest run calculations**
   ```javascript
   const shadowResult = await storage.shadowCalculateUserStats(userId);
   console.log(`Legacy longest: ${shadowResult.legacy.longestRunDays} days`);
   console.log(`V2 longest: ${shadowResult.v2.longestRunDays} days`);
   ```

2. **Identify specific runs causing difference**
   ```javascript
   const runs = await storage.getUserRuns(userId);
   const sortedRuns = runs.sort((a, b) => b.dayCount - a.dayCount);
   console.log('Top 3 longest runs:', sortedRuns.slice(0, 3).map(r => 
     `${r.dayCount} days (${r.startDate} to ${r.endDate})`
   ));
   ```

### Resolution Procedure

- Generally acceptable if difference is small (1-2 days)
- Investigate if difference is >5 days
- Consider algorithm alignment for consistency

## Bulk Diff Resolution

### When to Use
- Multiple users with same type of discrepancy
- Pattern of discrepancies across golden user dataset  
- System-wide calculation issues

### Procedure

1. **Identify affected users**
   ```javascript
   const diffReport = await storage.generateDiffReport(userIds);
   const criticalUsers = diffReport.detailedDiffs
     .filter(diff => diff.severity === 'critical')
     .map(diff => diff.userId);
   
   console.log(`${criticalUsers.length} users with critical discrepancies`);
   ```

2. **Categorize discrepancy types**
   ```javascript
   const discrepancyTypes = {};
   diffReport.detailedDiffs.forEach(diff => {
     Object.keys(diff.differences).forEach(type => {
       discrepancyTypes[type] = (discrepancyTypes[type] || 0) + 1;
     });
   });
   
   console.log('Discrepancy patterns:', discrepancyTypes);
   ```

3. **Apply bulk resolution**
   ```javascript
   const bulkResults = [];
   
   for (const userId of criticalUsers) {
     const mostCommonType = 'totalDays'; // Based on analysis above
     const result = await storage.resolveDiffDiscrepancy(userId, mostCommonType);
     bulkResults.push(result);
   }
   
   const resolved = bulkResults.filter(r => r.resolved).length;
   console.log(`Bulk resolution: ${resolved}/${bulkResults.length} resolved`);
   ```

## Golden User Dataset Validation

### Failed Golden User Recovery

1. **Identify failed golden user types**
   ```javascript
   const goldenValidation = await storage.validateGoldenUserDataset();
   
   if (goldenValidation.overallResult === 'fail') {
     console.log('Golden user failures:');
     goldenValidation.failureReasons.forEach(reason => {
       console.log(`  ❌ ${reason}`);
     });
   }
   ```

2. **Resolve each golden user type**
   ```javascript
   const failedUsers = goldenValidation.goldenUsers
     .filter(gu => gu.diffResult.hasDifferences);
   
   for (const goldenUser of failedUsers) {
     console.log(`Resolving golden user: ${goldenUser.userType}`);
     
     // Determine primary discrepancy type
     const primaryDiff = Object.keys(goldenUser.diffResult.differences)[0];
     
     const resolution = await storage.resolveDiffDiscrepancy(
       goldenUser.userId, 
       primaryDiff
     );
     
     if (resolution.resolved) {
       console.log(`✅ ${goldenUser.userType} resolved`);
     } else {
       console.log(`❌ ${goldenUser.userType} requires manual investigation`);
     }
   }
   ```

3. **Re-validate after resolution**
   ```javascript
   const retestValidation = await storage.validateGoldenUserDataset();
   if (retestValidation.overallResult === 'pass') {
     console.log('✅ All golden users now pass validation');
   }
   ```

## Escalation Procedures

### Automatic Escalation Triggers
- **Critical discrepancies** persist after automatic resolution
- **>5% of users** show any discrepancies  
- **Performance impact** exceeds 5% overhead
- **Golden user validation** fails after resolution attempts

### Escalation Steps

1. **Level 1: Engineering Team**
   - Algorithm bugs in calculation logic
   - Data integrity issues
   - Performance optimization needs

2. **Level 2: Engineering + Product**
   - User experience impacts
   - Cutover timeline adjustments
   - Feature scope changes

3. **Level 3: All Stakeholders**
   - Production deployment delays
   - Architecture changes required
   - External dependency issues

### Escalation Documentation

```javascript
// Document escalation case
const escalationCase = {
  caseId: randomUUID(),
  severity: 'critical',
  affectedUsers: userIds.length,
  discrepancyType: 'totalDays',
  resolutionAttempts: ['automatic', 'manual-rebuild', 'data-validation'],
  impactAssessment: 'Production cutover blocked',
  recommendedAction: 'Algorithm review and data audit required',
  stakeholdersNotified: ['engineering', 'product', 'operations'],
  escalatedAt: new Date()
};
```

## Prevention Strategies

### Continuous Monitoring
- Run hourly diff validation on golden users
- Monitor shadow performance metrics continuously  
- Alert on any new discrepancy patterns

### Code Quality Gates
- Require 100% golden user validation before merges
- Performance regression testing for shadow calculations
- Automated diff testing in CI/CD pipeline

### Data Quality Assurance
- Regular invariant validation
- Backup verification procedures
- Cross-environment consistency checks

---

*Last Updated: 2025-09-07*
*Version: 1.0*