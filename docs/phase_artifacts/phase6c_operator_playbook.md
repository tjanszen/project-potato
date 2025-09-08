# Phase 6C Operator Playbook: Backfill/Rebuild Operations

## Overview

This playbook provides step-by-step procedures for operating the rebuild_user_runs administrative system. Use these procedures for data maintenance, recovery scenarios, and system migrations.

## Quick Reference

### Emergency Procedures
- **Data Corruption**: [Single User Recovery](#single-user-recovery)
- **System-wide Issues**: [Bulk Recovery](#bulk-recovery-procedure)
- **Rollback**: [Restore from Backup](#restore-from-backup)

### Routine Operations
- **Algorithm Updates**: [Mass Rebuild](#mass-rebuild-procedure)
- **Performance Issues**: [Partial Rebuild](#partial-rebuild-procedure)
- **Migration**: [Timezone Migration](#timezone-migration-procedure)

## Prerequisites

### Required Access
- Database admin credentials (READ/WRITE access to `runs`, `day_marks`, `users` tables)
- Application server access for Node.js runtime
- Monitoring dashboard access for progress tracking

### Required Knowledge
- Understanding of Project Potato data model
- Familiarity with PostgreSQL/SQLite operations
- Basic understanding of runs table invariants

### Safety Checklist
- [ ] Maintenance window scheduled (if bulk operation)
- [ ] Database backup completed
- [ ] Feature flag status verified (`ff.potato.runs_v2`)
- [ ] Monitoring alerts configured
- [ ] Rollback plan confirmed

## Single User Recovery

### When to Use
- User reports missing/incorrect run data
- Data corruption detected for specific user
- User timezone change requires recalculation

### Procedure

1. **Identify the User**
   ```javascript
   // Get user ID from email or other identifier
   const user = await storage.getUserByEmail('user@example.com');
   const userId = user.id;
   ```

2. **Pre-Recovery Validation**
   ```javascript
   // Check current state
   const currentRuns = await storage.getUserRuns(userId);
   console.log(`Current runs: ${currentRuns.length}`);
   
   // Check day marks integrity
   const dayMarks = await storage.getUserDayMarks(userId);
   console.log(`Day marks: ${dayMarks.length}`);
   ```

3. **Execute Rebuild**
   ```javascript
   // Full rebuild
   const result = await storage.rebuildUserRuns(userId);
   
   if (result.success) {
     console.log(`✅ Rebuild successful`);
     console.log(`Deleted: ${result.runsDeleted} runs`);
     console.log(`Created: ${result.runsCreated} runs`);
     console.log(`Duration: ${result.durationMs}ms`);
   } else {
     console.log(`❌ Rebuild failed: ${result.invariantViolations} violations`);
     // Proceed to rollback
   }
   ```

4. **Post-Recovery Validation**
   ```javascript
   // Verify invariants
   const validation = await storage.validateRebuildResults(
     userId, 
     currentRuns, 
     await storage.getUserRuns(userId)
   );
   
   if (validation.valid) {
     console.log('✅ All invariants satisfied');
   } else {
     console.log('❌ Validation failed:', validation.invariantViolations);
     // Proceed to rollback
   }
   ```

5. **Rollback if Needed**
   ```javascript
   if (!result.success && result.backup) {
     await storage.restoreUserRuns(userId, result.backup);
     console.log('✅ Rollback completed');
   }
   ```

### Expected Results
- **Duration**: <1 second for typical user (365 day history)
- **Success Rate**: >99% for valid day_marks data
- **Data Integrity**: 0 invariant violations

## Partial Rebuild Procedure

### When to Use
- Large date range needs recalculation
- Performance optimization for heavy users
- Targeted fix for specific time period

### Procedure

1. **Define Date Range**
   ```javascript
   const fromDate = '2025-01-01';  // Optional
   const toDate = '2025-06-30';    // Optional
   ```

2. **Execute Partial Rebuild**
   ```javascript
   const result = await storage.rebuildUserRuns(userId, fromDate, toDate);
   
   console.log(`Processed ${result.totalDaysProcessed} days in range`);
   console.log(`${result.runsDeleted} runs deleted, ${result.runsCreated} created`);
   ```

3. **Verify Range Isolation**
   ```javascript
   // Check that runs outside the range were preserved
   const allRuns = await storage.getUserRuns(userId);
   const outsideRange = allRuns.filter(run => 
     run.startDate < fromDate || run.endDate > toDate
   );
   console.log(`Preserved ${outsideRange.length} runs outside target range`);
   ```

### Performance Targets
- **<500ms** for 30-day range
- **<2s** for 180-day range
- **<5s** for full year range

## Bulk Recovery Procedure

### When to Use
- Algorithm updates affecting all users
- Database migration requiring rebuild
- System-wide data corruption

### Procedure

1. **Preparation Phase**
   ```javascript
   // Get all user IDs (or filtered subset)
   const allUsers = await storage.getAllUsers();
   const userIds = allUsers.map(u => u.id);
   
   console.log(`Planning bulk rebuild for ${userIds.length} users`);
   ```

2. **Configure Bulk Operation**
   ```javascript
   const config = {
     batchSize: 10,        // Users per batch
     maxWorkers: 5,        // Concurrent batches
     dryRun: true,         // Set false for actual execution
     fromDate: undefined,  // Optional date range
     toDate: undefined,
     skipBackup: false     // Set true for performance (risky)
   };
   ```

3. **Execute Dry Run**
   ```javascript
   const dryResult = await storage.bulkRebuildUsers(userIds, config);
   console.log(`[DRY RUN] Would process ${dryResult.totalUsers} users`);
   ```

4. **Execute Actual Rebuild**
   ```javascript
   config.dryRun = false;
   const result = await storage.bulkRebuildUsers(userIds, config);
   
   console.log(`Completed: ${result.completedUsers}`);
   console.log(`Failed: ${result.failedUsers}`);
   console.log(`Duration: ${result.totalDurationMs}ms`);
   console.log(`Average: ${result.averageDurationMs}ms per user`);
   
   if (result.errors.length > 0) {
     console.log('Errors:', result.errors);
   }
   ```

5. **Progress Monitoring**
   ```javascript
   // Check progress during long-running operations
   const progress = await storage.getRebuildProgress(result.operationId);
   console.log(`Status: ${progress.status}`);
   console.log(`Progress: ${progress.processedUsers}/${progress.totalUsers}`);
   ```

### Performance Targets
- **1000 users/hour** for full rebuild
- **5000 users/hour** for partial rebuild
- **<0.1% failure rate** under normal conditions

## Timezone Migration Procedure

### When to Use
- User changes timezone setting
- Global timezone policy changes
- DST transition corrections

### Procedure

1. **Identify Affected Users**
   ```javascript
   // Users who changed timezone recently
   const affectedUsers = await storage.getUsersWithTimezoneChanges();
   
   // Or specific user timezone change
   const userId = 'specific-user-id';
   const newTimezone = 'America/Los_Angeles';
   ```

2. **Update User Timezone**
   ```javascript
   await storage.updateUser(userId, { timezone: newTimezone });
   ```

3. **Rebuild with New Timezone Context**
   ```javascript
   // Full rebuild considers user's new timezone for "today" calculation
   const result = await storage.rebuildUserRuns(userId);
   
   // Verify active run status is correct for new timezone
   const activeRun = await storage.getActiveRun(userId);
   console.log(`Active run updated for timezone: ${newTimezone}`);
   ```

### Important Notes
- **Historical Data**: Past day_marks remain unchanged
- **Active Run**: May change status based on new timezone's "today"
- **No Data Loss**: Timezone changes never delete day_marks

## Error Recovery Scenarios

### Scenario 1: Invariant Violations

```javascript
// Detect violations
const violations = await storage.validateInvariantsAfterStress();

if (violations.overlappingRuns > 0) {
  console.log(`❌ Found ${violations.overlappingRuns} overlapping runs`);
  
  // Strategy 1: Rebuild affected users
  const affectedUsers = await storage.getUsersWithOverlappingRuns();
  for (const userId of affectedUsers) {
    await storage.rebuildUserRuns(userId);
  }
}

if (violations.multipleActiveRuns > 0) {
  console.log(`❌ Found users with multiple active runs`);
  
  // Strategy 2: Deactivate all but most recent run
  const affectedUsers = await storage.getUsersWithMultipleActiveRuns();
  for (const userId of affectedUsers) {
    await storage.rebuildUserRuns(userId);
  }
}
```

### Scenario 2: Performance Degradation

```javascript
// Identify slow rebuilds
const slowUsers = await storage.getUsersWithSlowRebuildHistory();

for (const userId of slowUsers) {
  // Use partial rebuilds to improve performance
  const result = await storage.rebuildUserRuns(
    userId,
    '2025-01-01',  // Recent data only
    new Date().toISOString().split('T')[0]
  );
  
  if (result.durationMs > 5000) {
    console.log(`⚠️ User ${userId} still slow: ${result.durationMs}ms`);
    // Consider data archival or specialized handling
  }
}
```

### Scenario 3: Data Corruption

```javascript
// Detect corruption patterns
const corruptedUsers = await storage.detectDataCorruption();

for (const userId of corruptedUsers) {
  console.log(`🔧 Repairing user ${userId}`);
  
  // 1. Create backup
  const backup = await storage.backupUserRuns(userId);
  
  // 2. Attempt rebuild
  const result = await storage.rebuildUserRuns(userId);
  
  // 3. Validate or rollback
  if (!result.success) {
    await storage.restoreUserRuns(userId, backup);
    console.log(`❌ Could not repair ${userId}, restored from backup`);
  } else {
    console.log(`✅ Successfully repaired ${userId}`);
  }
}
```

## Restore from Backup

### When to Use
- Rebuild operation failed
- Data corruption discovered after rebuild
- Emergency rollback required

### Procedure

```javascript
// 1. Retrieve backup from rebuild result
const rebuildResult = /* previous rebuild result with backup */;
const backup = rebuildResult.backup;

if (backup) {
  // 2. Restore from backup
  await storage.restoreUserRuns(userId, backup);
  
  // 3. Verify restoration
  const restoredRuns = await storage.getUserRuns(userId);
  console.log(`Restored ${restoredRuns.length} runs from ${backup.timestamp}`);
  
  // 4. Validate restoration
  if (restoredRuns.length === backup.metadata.totalRuns) {
    console.log('✅ Backup restoration successful');
  } else {
    console.log('❌ Backup restoration incomplete');
  }
} else {
  console.log('❌ No backup available for rollback');
  // Proceed with manual recovery or data reconstruction
}
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Rebuild Success Rate**
   ```javascript
   // Target: >99% success rate
   const successRate = (completedUsers / totalUsers) * 100;
   if (successRate < 99) {
     // Alert: High rebuild failure rate
   }
   ```

2. **Performance Degradation**
   ```javascript
   // Target: <1s average rebuild time
   const avgDuration = result.averageDurationMs;
   if (avgDuration > 1000) {
     // Alert: Rebuild performance degradation
   }
   ```

3. **Invariant Violations**
   ```javascript
   // Target: 0 violations
   const violations = result.invariantViolations;
   if (violations > 0) {
     // Alert: Data integrity violations detected
   }
   ```

### Alerting Configuration

```yaml
# Sample alert configuration
alerts:
  - name: "Rebuild Failure Rate High"
    condition: "rebuild_success_rate < 0.99"
    severity: "P1"
    
  - name: "Rebuild Performance Slow"
    condition: "rebuild_avg_duration_ms > 1000"
    severity: "P2"
    
  - name: "Invariant Violations"
    condition: "rebuild_invariant_violations > 0"
    severity: "P0"
```

## Troubleshooting Guide

### Common Issues

1. **"No day_marks found for user"**
   - Check user exists in database
   - Verify user has actual day marking history
   - Confirm `value = true` entries exist

2. **"Rebuild takes too long (>10s)"**
   - Check for excessive day_marks history (>1000 entries)
   - Consider partial rebuild approach
   - Verify database indexes are present

3. **"Invariant violations after rebuild"**
   - Usually indicates bug in groupConsecutiveDates algorithm
   - Check for timezone-related edge cases
   - Verify daterange construction logic

4. **"Backup restoration failed"**
   - Check backup data integrity
   - Verify user_id consistency
   - Confirm runs table schema compatibility

### Debug Procedures

```javascript
// Enable detailed logging
const debugResult = await storage.rebuildUserRuns(userId);
console.log('Detailed rebuild info:', {
  operationId: debugResult.operationId,
  dayMarksProcessed: debugResult.totalDaysProcessed,
  runsCreated: debugResult.runsCreated,
  durationBreakdown: debugResult.durationMs
});

// Inspect intermediate data
const dayMarks = await storage.getUserDayMarks(userId);
const groupedRuns = storage.groupConsecutiveDates(dayMarks.map(dm => dm.date));
console.log('Consecutive groups:', groupedRuns);
```

## Best Practices

### Before Rebuild Operations
- Always create backups for non-trivial operations
- Use dry-run mode for bulk operations
- Verify feature flag status
- Schedule maintenance windows for bulk operations

### During Operations
- Monitor progress for long-running operations
- Check error logs continuously
- Maintain communication with stakeholders
- Document any deviations from standard procedures

### After Operations
- Validate all invariants
- Review performance metrics
- Update operational logs
- Archive backups according to retention policy

## Contact Information

For escalation or complex issues:
- **P0 Issues**: Database team + Engineering on-call
- **P1 Issues**: Engineering team during business hours
- **P2 Issues**: Standard support ticket

---

*Last Updated: 2025-09-07*
*Version: 1.0*