#!/usr/bin/env node

// Test script for Phase C backfill functionality
require('dotenv').config();

async function testBackfill() {
    console.log('🧪 Testing Phase C Backfill Functionality');
    console.log('==========================================');
    
    try {
        // Load storage module
        console.log('Loading storage...');
        const { storage } = require('./server/storage.js');
        console.log('✅ Storage loaded successfully');
        
        // Check feature flag status
        const { featureFlagService } = require('./server/feature-flags.js');
        const runsV2Enabled = featureFlagService.isEnabled('ff.potato.runs_v2');
        console.log(`🏃 FF_POTATO_RUNS_V2: ${runsV2Enabled}`);
        
        if (!runsV2Enabled) {
            console.log('❌ Runs V2 feature flag is disabled - cannot proceed');
            return;
        }
        
        // Run dry run first to see what would be processed
        console.log('\n🔍 Running DRY RUN to preview backfill...');
        const dryRunResult = await storage.backfillAllUserRuns({
            dryRun: true,
            batchSize: 5
        });
        
        console.log('📊 Dry Run Results:');
        console.log(`   - Total users to process: ${dryRunResult.totalUsers}`);
        console.log(`   - Users with day_marks: ${dryRunResult.usersToProcess?.length || 0}`);
        if (dryRunResult.usersToProcess?.length > 0) {
            console.log(`   - Sample user IDs: ${dryRunResult.usersToProcess.slice(0, 3).join(', ')}...`);
        }
        
        // Ask for confirmation to proceed with actual backfill
        console.log('\n⚡ Proceeding with ACTUAL BACKFILL...');
        const backfillResult = await storage.backfillAllUserRuns({
            dryRun: false,
            batchSize: 3,  // Small batch for testing
            skipBackup: false
        });
        
        console.log('\n🎯 Backfill Results:');
        console.log(`   - Operation ID: ${backfillResult.operationId}`);
        console.log(`   - Total users: ${backfillResult.totalUsers}`);
        console.log(`   - Completed: ${backfillResult.completedUsers}`);
        console.log(`   - Failed: ${backfillResult.failedUsers}`);
        console.log(`   - Duration: ${backfillResult.totalDurationMs}ms`);
        console.log(`   - Invariant violations: ${backfillResult.invariantViolations}`);
        
        if (backfillResult.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            backfillResult.errors.forEach(error => {
                console.log(`   - ${error.userId}: ${error.error}`);
            });
        }
        
        console.log('\n✅ Backfill test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testBackfill().then(() => {
    console.log('\n🏁 Test script finished');
    process.exit(0);
}).catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});