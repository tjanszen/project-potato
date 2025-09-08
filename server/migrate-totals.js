// Phase 7A-3: Migration script for existing users totals
// Migrates historical totals data for all existing users

const { Pool } = require('pg');
const { 
  calculateRealTimeTotals, 
  updateMonthlyAggregates,
  bulkReconciliation 
} = require('./totals-aggregation');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Migrate totals for a single user
 * @param {string} userId - User ID to migrate
 * @returns {Promise<Object>} Migration result
 */
async function migrateUserTotals(userId) {
  const startTime = Date.now();
  
  try {
    console.log(`[Migration] Starting migration for user ${userId}`);
    
    // Calculate real-time totals
    const realTimeTotals = await calculateRealTimeTotals(pool, userId);
    
    // Get all months that need migration (months where user has day marks)
    const monthsQuery = `
      SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') as year_month
      FROM day_marks 
      WHERE user_id = $1
      ORDER BY year_month
    `;
    const monthsResult = await pool.query(monthsQuery, [userId]);
    const months = monthsResult.rows.map(row => row.year_month);
    
    // Add current month if not already included
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!months.includes(currentMonth)) {
      months.push(currentMonth);
    }
    
    console.log(`[Migration] User ${userId}: Migrating ${months.length} months`);
    
    // Update aggregates for each month
    const results = [];
    for (const month of months) {
      try {
        const result = await updateMonthlyAggregates(pool, userId, month);
        results.push({ month, success: true, result });
        console.log(`[Migration] User ${userId}: Month ${month} migrated`);
      } catch (error) {
        console.error(`[Migration] User ${userId}: Month ${month} failed:`, error);
        results.push({ month, success: false, error: error.message });
      }
    }
    
    const processingTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    
    console.log(`[Migration] User ${userId}: Completed ${successCount}/${months.length} months in ${processingTime}ms`);
    
    return {
      userId,
      success: successCount === months.length,
      totalMonths: months.length,
      successfulMonths: successCount,
      failedMonths: months.length - successCount,
      realTimeTotals,
      processingTimeMs: processingTime,
      monthResults: results
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Migration] User ${userId}: Fatal error:`, error);
    
    return {
      userId,
      success: false,
      error: error.message,
      processingTimeMs: processingTime
    };
  }
}

/**
 * Migrate totals for all users
 * @param {Array} userIds - Optional array of specific user IDs to migrate
 * @returns {Promise<Object>} Migration summary
 */
async function migrateAllUserTotals(userIds = []) {
  const startTime = Date.now();
  
  console.log('[Migration] Starting bulk totals migration');
  
  try {
    // Get users to migrate
    let usersToMigrate = userIds;
    if (usersToMigrate.length === 0) {
      const usersQuery = `SELECT id FROM users ORDER BY id`;
      const usersResult = await pool.query(usersQuery);
      usersToMigrate = usersResult.rows.map(row => row.id);
    }
    
    console.log(`[Migration] Processing ${usersToMigrate.length} users`);
    
    const summary = {
      totalUsers: usersToMigrate.length,
      successful: 0,
      failed: 0,
      results: [],
      processingTimeMs: 0
    };
    
    // Process users in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < usersToMigrate.length; i += batchSize) {
      const batch = usersToMigrate.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (userId) => {
        const result = await migrateUserTotals(userId);
        if (result.success) {
          summary.successful++;
        } else {
          summary.failed++;
        }
        summary.results.push(result);
        return result;
      });
      
      await Promise.all(batchPromises);
      
      // Log progress
      console.log(`[Migration] Processed ${Math.min(i + batchSize, usersToMigrate.length)} / ${usersToMigrate.length} users`);
    }
    
    summary.processingTimeMs = Date.now() - startTime;
    
    console.log(`[Migration] Completed: ${summary.successful} successful, ${summary.failed} failed in ${summary.processingTimeMs}ms`);
    
    return summary;
  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    throw error;
  }
}

/**
 * Validate migration results by comparing with real-time calculations
 * @param {Array} userIds - Optional array of specific user IDs to validate
 * @returns {Promise<Object>} Validation summary
 */
async function validateMigration(userIds = []) {
  console.log('[Migration] Starting validation');
  
  try {
    // Use the reconciliation function from Phase 7A-2
    const reconciliationSummary = await bulkReconciliation(pool, userIds);
    
    const validation = {
      totalUsers: reconciliationSummary.totalUsers,
      matches: reconciliationSummary.matches,
      mismatches: reconciliationSummary.mismatches,
      errors: reconciliationSummary.errors,
      processingTimeMs: reconciliationSummary.processingTimeMs,
      correlationId: reconciliationSummary.correlationId,
      validationStatus: reconciliationSummary.mismatches === 0 && reconciliationSummary.errors === 0 ? 'PASS' : 'FAIL'
    };
    
    console.log(`[Migration] Validation ${validation.validationStatus}: ${validation.matches} matches, ${validation.mismatches} mismatches, ${validation.errors} errors`);
    
    return validation;
  } catch (error) {
    console.error('[Migration] Validation error:', error);
    return {
      validationStatus: 'ERROR',
      error: error.message
    };
  }
}

/**
 * Main migration function with validation
 * @param {Array} userIds - Optional array of specific user IDs to migrate
 * @returns {Promise<Object>} Complete migration and validation results
 */
async function runMigrationWithValidation(userIds = []) {
  console.log('[Migration] Starting migration with validation');
  
  try {
    // Step 1: Run migration
    const migrationResult = await migrateAllUserTotals(userIds);
    
    // Step 2: Validate results
    const validationResult = await validateMigration(userIds);
    
    const summary = {
      migration: migrationResult,
      validation: validationResult,
      overallStatus: migrationResult.failed === 0 && validationResult.validationStatus === 'PASS' ? 'SUCCESS' : 'FAILED'
    };
    
    console.log(`[Migration] Overall status: ${summary.overallStatus}`);
    
    return summary;
  } catch (error) {
    console.error('[Migration] Migration with validation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// CLI support - run migration if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const userIds = args.length > 0 ? args : [];
  
  if (userIds.length > 0) {
    console.log(`Running migration for specific users: ${userIds.join(', ')}`);
  } else {
    console.log('Running migration for all users');
  }
  
  runMigrationWithValidation(userIds)
    .then(result => {
      console.log('\n=== MIGRATION COMPLETE ===');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.overallStatus === 'SUCCESS' ? 0 : 1);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateUserTotals,
  migrateAllUserTotals,
  validateMigration,
  runMigrationWithValidation
};