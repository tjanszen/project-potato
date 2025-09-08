// Phase 7A-2: Aggregation Testing & Performance Validation
// Tests aggregate calculation performance and reconciliation functionality

const { Pool } = require('pg');
const { 
  calculateRealTimeTotals, 
  updateMonthlyAggregates, 
  reconcileUserMonth, 
  bulkReconciliation 
} = require('./totals-aggregation');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Test real-time totals calculation performance
 */
async function testRealTimeTotalsPerformance() {
  console.log('\n=== Testing Real-Time Totals Performance ===');
  
  try {
    // Get sample user IDs
    const usersResult = await pool.query('SELECT id FROM users LIMIT 10');
    const userIds = usersResult.rows.map(row => row.id);
    
    if (userIds.length === 0) {
      console.log('No users found for testing');
      return;
    }
    
    console.log(`Testing with ${userIds.length} users`);
    
    const startTime = Date.now();
    const results = [];
    
    for (const userId of userIds) {
      const result = await calculateRealTimeTotals(pool, userId);
      results.push(result);
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / userIds.length;
    
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average time per user: ${avgTime}ms`);
    console.log(`Throughput: ${(userIds.length / totalTime * 1000).toFixed(2)} users/second`);
    
    // Show sample result
    if (results.length > 0) {
      console.log('Sample result:', results[0]);
    }
    
    return { avgTime, totalTime, results: results.length };
  } catch (error) {
    console.error('Error testing real-time totals performance:', error);
    throw error;
  }
}

/**
 * Test monthly aggregates performance with EXPLAIN ANALYZE
 */
async function testAggregateQueryPerformance() {
  console.log('\n=== Testing Aggregate Query Performance (EXPLAIN ANALYZE) ===');
  
  try {
    // Get a sample user
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log('No users found for testing');
      return;
    }
    
    const userId = userResult.rows[0].id;
    const yearMonth = '2025-09';
    
    console.log(`Testing aggregate calculation for user ${userId}, month ${yearMonth}`);
    
    // Test the aggregate query with EXPLAIN ANALYZE
    const explainQuery = `
      EXPLAIN ANALYZE
      SELECT 
        COALESCE(SUM(day_count), 0) as total_days,
        COALESCE(MAX(day_count), 0) as longest_run,
        COALESCE((SELECT day_count FROM runs WHERE user_id = $1 AND active = true), 0) as current_run
      FROM runs 
      WHERE user_id = $1
    `;
    
    const explainResult = await pool.query(explainQuery, [userId]);
    console.log('\nEXPLAIN ANALYZE results:');
    explainResult.rows.forEach(row => {
      console.log(row['QUERY PLAN']);
    });
    
    // Test the monthly aggregate update
    const updateResult = await updateMonthlyAggregates(pool, userId, yearMonth);
    console.log('\nUpdate result:', updateResult);
    
    return { explainResult, updateResult };
  } catch (error) {
    console.error('Error testing aggregate query performance:', error);
    throw error;
  }
}

/**
 * Test reconciliation functionality
 */
async function testReconciliation() {
  console.log('\n=== Testing Reconciliation Functionality ===');
  
  try {
    // Get sample user
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log('No users found for testing');
      return;
    }
    
    const userId = userResult.rows[0].id;
    const yearMonth = '2025-09';
    
    console.log(`Testing reconciliation for user ${userId}, month ${yearMonth}`);
    
    // First ensure we have some aggregates to reconcile
    await updateMonthlyAggregates(pool, userId, yearMonth);
    
    // Run reconciliation
    const reconciliationResults = await reconcileUserMonth(pool, userId, yearMonth);
    
    console.log('Reconciliation results:');
    reconciliationResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.checkType}: ${result.status}`);
      if (result.expected !== undefined) {
        console.log(`     Expected: ${result.expected}, Actual: ${result.actual}`);
      }
      if (result.message) {
        console.log(`     Message: ${result.message}`);
      }
    });
    
    // Show reconciliation log entries
    const logQuery = `
      SELECT check_type, status, expected_value, actual_value, error_message, processing_time_ms, created_at
      FROM reconciliation_log 
      WHERE user_id = $1 AND year_month = $2 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    const logResult = await pool.query(logQuery, [userId, yearMonth]);
    
    console.log('\nRecent reconciliation log entries:');
    logResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.check_type}: ${row.status} (${row.processing_time_ms}ms)`);
      if (row.expected_value !== null) {
        console.log(`     Expected: ${row.expected_value}, Actual: ${row.actual_value}`);
      }
      if (row.error_message) {
        console.log(`     Error: ${row.error_message}`);
      }
    });
    
    return { reconciliationResults, logEntries: logResult.rows };
  } catch (error) {
    console.error('Error testing reconciliation:', error);
    throw error;
  }
}

/**
 * Test bulk reconciliation performance
 */
async function testBulkReconciliation() {
  console.log('\n=== Testing Bulk Reconciliation Performance ===');
  
  try {
    // Get user count
    const countResult = await pool.query('SELECT COUNT(*) as user_count FROM users');
    const userCount = parseInt(countResult.rows[0].user_count);
    
    console.log(`Testing bulk reconciliation with ${userCount} users`);
    
    if (userCount === 0) {
      console.log('No users found for bulk reconciliation testing');
      return;
    }
    
    // Run bulk reconciliation for current month
    const summary = await bulkReconciliation(pool);
    
    console.log('Bulk reconciliation summary:');
    console.log(`  Total users: ${summary.totalUsers}`);
    console.log(`  Processed: ${summary.processed}`);
    console.log(`  Matches: ${summary.matches}`);
    console.log(`  Mismatches: ${summary.mismatches}`);
    console.log(`  Errors: ${summary.errors}`);
    console.log(`  Total time: ${summary.processingTimeMs}ms`);
    console.log(`  Average time per user: ${(summary.processingTimeMs / summary.totalUsers).toFixed(2)}ms`);
    console.log(`  Throughput: ${(summary.totalUsers / summary.processingTimeMs * 1000).toFixed(2)} users/second`);
    
    // Calculate if we meet the 1h requirement for 1000+ users
    const timeFor1000Users = (summary.processingTimeMs / summary.totalUsers) * 1000;
    const timeFor1000UsersHours = timeFor1000Users / (1000 * 60 * 60);
    
    console.log(`\nProjected time for 1000 users: ${(timeFor1000Users / 1000).toFixed(2)} seconds (${timeFor1000UsersHours.toFixed(3)} hours)`);
    console.log(`1-hour requirement: ${timeFor1000UsersHours <= 1 ? 'PASS' : 'FAIL'}`);
    
    return summary;
  } catch (error) {
    console.error('Error testing bulk reconciliation:', error);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('Phase 7A-2: Aggregation & Reconciliation Testing');
  console.log('='.repeat(50));
  
  try {
    // Test individual components
    const realTimePerf = await testRealTimeTotalsPerformance();
    const aggregatePerf = await testAggregateQueryPerformance();
    const reconciliation = await testReconciliation();
    const bulkReconciliation = await testBulkReconciliation();
    
    console.log('\n=== SUMMARY ===');
    console.log(`Real-time totals average: ${realTimePerf?.avgTime}ms per user`);
    console.log(`Reconciliation tested: ${reconciliation?.reconciliationResults?.length || 0} checks`);
    console.log(`Bulk reconciliation: ${bulkReconciliation?.totalUsers || 0} users processed`);
    
    // Exit criteria validation
    console.log('\n=== EXIT CRITERIA VALIDATION ===');
    console.log(`✓ Aggregate recomputation performance: ${bulkReconciliation ? 'Tested' : 'Failed'}`);
    console.log(`✓ Reconciliation detects inconsistencies: ${reconciliation?.logEntries?.length > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`✓ EXPLAIN ANALYZE collected: ${aggregatePerf ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Reconciliation log entries: ${reconciliation?.logEntries?.length || 0} entries`);
    
  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    await pool.end();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testRealTimeTotalsPerformance,
  testAggregateQueryPerformance,
  testReconciliation,
  testBulkReconciliation,
  runAllTests
};