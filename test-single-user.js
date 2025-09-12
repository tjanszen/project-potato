#!/usr/bin/env node

// Test script for single user rebuild - Phase C recovery
require('dotenv').config();

const TEST_USER_ID = 'ec71370a-b07c-413e-b9b7-14862d903887';

async function testSingleUserRebuild() {
    console.log('🧪 Testing Single User Rebuild - Phase C Recovery');
    console.log('================================================');
    console.log(`Target User: ${TEST_USER_ID}`);
    
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
        
        // Run rebuild for single test user
        console.log(`\n🔧 Running rebuildUserRuns for test user: ${TEST_USER_ID}`);
        const rebuildResult = await storage.rebuildUserRuns(TEST_USER_ID);
        
        console.log('\n📊 Rebuild Results:');
        console.log(`   - Success: ${rebuildResult.success}`);
        console.log(`   - Operation ID: ${rebuildResult.operationId}`);
        console.log(`   - Runs created: ${rebuildResult.runsCreated}`);
        console.log(`   - Days processed: ${rebuildResult.totalDaysProcessed}`);
        console.log(`   - Duration: ${rebuildResult.durationMs}ms`);
        console.log(`   - Invariant violations: ${rebuildResult.invariantViolations}`);
        
        if (!rebuildResult.success) {
            console.log(`❌ Rebuild failed: ${rebuildResult.error || 'Unknown error'}`);
            return;
        }
        
        console.log('\n✅ Single user rebuild completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testSingleUserRebuild().then(() => {
    console.log('\n🏁 Single user test finished');
    process.exit(0);
}).catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});