// Phase 7A-2: Totals Aggregation & Reconciliation
// Implements monthly aggregate calculation and nightly reconciliation job

const { v4: uuidv4 } = require('uuid');

/**
 * Calculate real-time totals for a user from runs table
 * @param {Object} db - Database connection
 * @param {string} userId - User ID to calculate totals for
 * @returns {Promise<Object>} Real-time totals { totalDays, longestRun, currentRun }
 */
async function calculateRealTimeTotals(db, userId) {
  const startTime = Date.now();
  
  try {
    const query = `
      SELECT 
        COALESCE(SUM(day_count), 0) as total_days,
        COALESCE(MAX(day_count), 0) as longest_run,
        COALESCE((SELECT day_count FROM runs WHERE user_id = $1 AND active = true), 0) as current_run
      FROM runs 
      WHERE user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    const totals = result.rows[0];
    
    const processingTime = Date.now() - startTime;
    console.log(`[Totals] Real-time calculation for user ${userId}: ${processingTime}ms`);
    
    return {
      totalDays: parseInt(totals.total_days),
      longestRun: parseInt(totals.longest_run),
      currentRun: parseInt(totals.current_run),
      processingTimeMs: processingTime
    };
  } catch (error) {
    console.error(`[Totals] Error calculating real-time totals for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update monthly aggregates for a specific user and month
 * @param {Object} db - Database connection
 * @param {string} userId - User ID
 * @param {string} yearMonth - Year-month in YYYY-MM format
 * @returns {Promise<Object>} Updated aggregate values
 */
async function updateMonthlyAggregates(db, userId, yearMonth) {
  const startTime = Date.now();
  
  try {
    // Calculate aggregates for the specific month
    const query = `
      WITH monthly_stats AS (
        SELECT 
          COALESCE(SUM(day_count), 0) as total_days,
          COALESCE(MAX(day_count), 0) as longest_run_days,
          COALESCE((SELECT day_count FROM runs WHERE user_id = $1 AND active = true), NULL) as active_run_days
        FROM runs 
        WHERE user_id = $1 
        AND (
          TO_CHAR(start_date, 'YYYY-MM') = $2 
          OR TO_CHAR(end_date, 'YYYY-MM') = $2
          OR (start_date <= ($2 || '-01')::date AND end_date >= (DATE_TRUNC('month', ($2 || '-01')::date) + INTERVAL '1 month - 1 day')::date)
        )
      )
      INSERT INTO run_totals (user_id, year_month, total_days, longest_run_days, active_run_days, updated_at)
      SELECT $1, $2, total_days, longest_run_days, active_run_days, NOW()
      FROM monthly_stats
      ON CONFLICT (user_id, year_month) 
      DO UPDATE SET 
        total_days = EXCLUDED.total_days,
        longest_run_days = EXCLUDED.longest_run_days,
        active_run_days = EXCLUDED.active_run_days,
        updated_at = NOW()
      RETURNING total_days, longest_run_days, active_run_days;
    `;
    
    const result = await db.query(query, [userId, yearMonth]);
    const aggregates = result.rows[0];
    
    const processingTime = Date.now() - startTime;
    console.log(`[Aggregation] Updated ${userId} ${yearMonth}: ${processingTime}ms`);
    
    return {
      totalDays: parseInt(aggregates.total_days),
      longestRunDays: parseInt(aggregates.longest_run_days),
      activeRunDays: aggregates.active_run_days ? parseInt(aggregates.active_run_days) : null,
      processingTimeMs: processingTime
    };
  } catch (error) {
    console.error(`[Aggregation] Error updating monthly aggregates for ${userId} ${yearMonth}:`, error);
    throw error;
  }
}

/**
 * Reconcile stored aggregates against real-time calculations
 * @param {Object} db - Database connection
 * @param {string} userId - User ID to reconcile
 * @param {string} yearMonth - Year-month in YYYY-MM format
 * @param {string} correlationId - Correlation ID for tracing
 * @returns {Promise<Array>} Reconciliation results
 */
async function reconcileUserMonth(db, userId, yearMonth, correlationId = null) {
  const startTime = Date.now();
  const correlation = correlationId || uuidv4();
  
  try {
    // Get real-time calculations
    const realTime = await calculateRealTimeTotals(db, userId);
    
    // Get stored aggregates
    const storedQuery = `
      SELECT total_days, longest_run_days, active_run_days 
      FROM run_totals 
      WHERE user_id = $1 AND year_month = $2
    `;
    const storedResult = await db.query(storedQuery, [userId, yearMonth]);
    
    const results = [];
    
    if (storedResult.rows.length === 0) {
      // No stored aggregates found - log as error
      await logReconciliation(db, {
        userId,
        yearMonth,
        checkType: 'total_days',
        expectedValue: realTime.totalDays,
        actualValue: null,
        status: 'error',
        errorMessage: 'No stored aggregates found',
        processingTimeMs: Date.now() - startTime,
        correlationId: correlation
      });
      results.push({ checkType: 'total_days', status: 'error', message: 'No stored aggregates found' });
    } else {
      const stored = storedResult.rows[0];
      
      // Check total_days
      const totalDaysMatch = parseInt(stored.total_days) === realTime.totalDays;
      await logReconciliation(db, {
        userId,
        yearMonth,
        checkType: 'total_days',
        expectedValue: realTime.totalDays,
        actualValue: parseInt(stored.total_days),
        status: totalDaysMatch ? 'match' : 'mismatch',
        processingTimeMs: Date.now() - startTime,
        correlationId: correlation
      });
      results.push({ 
        checkType: 'total_days', 
        status: totalDaysMatch ? 'match' : 'mismatch',
        expected: realTime.totalDays,
        actual: parseInt(stored.total_days)
      });
      
      // Check longest_run
      const longestRunMatch = parseInt(stored.longest_run_days) === realTime.longestRun;
      await logReconciliation(db, {
        userId,
        yearMonth,
        checkType: 'longest_run',
        expectedValue: realTime.longestRun,
        actualValue: parseInt(stored.longest_run_days),
        status: longestRunMatch ? 'match' : 'mismatch',
        processingTimeMs: Date.now() - startTime,
        correlationId: correlation
      });
      results.push({ 
        checkType: 'longest_run', 
        status: longestRunMatch ? 'match' : 'mismatch',
        expected: realTime.longestRun,
        actual: parseInt(stored.longest_run_days)
      });
      
      // Check active_run
      const storedActive = stored.active_run_days ? parseInt(stored.active_run_days) : 0;
      const activeRunMatch = storedActive === realTime.currentRun;
      await logReconciliation(db, {
        userId,
        yearMonth,
        checkType: 'active_run',
        expectedValue: realTime.currentRun,
        actualValue: storedActive,
        status: activeRunMatch ? 'match' : 'mismatch',
        processingTimeMs: Date.now() - startTime,
        correlationId: correlation
      });
      results.push({ 
        checkType: 'active_run', 
        status: activeRunMatch ? 'match' : 'mismatch',
        expected: realTime.currentRun,
        actual: storedActive
      });
    }
    
    const totalProcessingTime = Date.now() - startTime;
    console.log(`[Reconciliation] User ${userId} ${yearMonth}: ${results.length} checks in ${totalProcessingTime}ms`);
    
    return results;
  } catch (error) {
    console.error(`[Reconciliation] Error reconciling ${userId} ${yearMonth}:`, error);
    
    // Log the error
    await logReconciliation(db, {
      userId,
      yearMonth,
      checkType: 'total_days',
      expectedValue: null,
      actualValue: null,
      status: 'error',
      errorMessage: error.message,
      processingTimeMs: Date.now() - startTime,
      correlationId: correlation
    });
    
    throw error;
  }
}

/**
 * Log reconciliation result to reconciliation_log table
 * @param {Object} db - Database connection
 * @param {Object} logEntry - Log entry data
 */
async function logReconciliation(db, logEntry) {
  try {
    const query = `
      INSERT INTO reconciliation_log 
      (user_id, year_month, check_type, expected_value, actual_value, status, error_message, processing_time_ms, correlation_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    await db.query(query, [
      logEntry.userId,
      logEntry.yearMonth,
      logEntry.checkType,
      logEntry.expectedValue,
      logEntry.actualValue,
      logEntry.status,
      logEntry.errorMessage || null,
      logEntry.processingTimeMs,
      logEntry.correlationId
    ]);
  } catch (error) {
    console.error('[Reconciliation] Error logging reconciliation result:', error);
    // Don't throw - we don't want logging errors to break reconciliation
  }
}

/**
 * Calculate real-time totals using V3 logic (MAX(end_date) approach) - STUB VERSION
 * @param {Object} db - Database connection
 * @param {string} userId - User ID to calculate totals for
 * @returns {Promise<Object>} Real-time totals { totalDays, longestRun, currentRun }
 */
async function calculateRealTimeTotalsV3(db, userId) {
  console.log(`[Totals V3] Stub function called for user ${userId}`);
  
  // STUB: Return placeholder values - actual V3 logic will be implemented in future phases
  return {
    totalDays: 0,
    longestRun: 0,
    currentRun: 0
  };
}

/**
 * Bulk reconciliation job for multiple users
 * @param {Object} db - Database connection
 * @param {Array} userIds - Array of user IDs to reconcile (optional - if empty, reconciles all)
 * @param {string} yearMonth - Year-month in YYYY-MM format (optional - if empty, uses current month)
 * @returns {Promise<Object>} Reconciliation summary
 */
async function bulkReconciliation(db, userIds = [], yearMonth = null) {
  const startTime = Date.now();
  const correlation = uuidv4();
  const targetMonth = yearMonth || new Date().toISOString().slice(0, 7); // YYYY-MM
  
  console.log(`[Bulk Reconciliation] Starting for month ${targetMonth} with correlation ${correlation}`);
  
  try {
    // Get users to reconcile
    let usersToReconcile = userIds;
    if (usersToReconcile.length === 0) {
      const usersQuery = `SELECT id FROM users ORDER BY id`;
      const usersResult = await db.query(usersQuery);
      usersToReconcile = usersResult.rows.map(row => row.id);
    }
    
    console.log(`[Bulk Reconciliation] Processing ${usersToReconcile.length} users`);
    
    const summary = {
      totalUsers: usersToReconcile.length,
      processed: 0,
      matches: 0,
      mismatches: 0,
      errors: 0,
      processingTimeMs: 0,
      correlationId: correlation
    };
    
    // Process users in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < usersToReconcile.length; i += batchSize) {
      const batch = usersToReconcile.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (userId) => {
        try {
          const results = await reconcileUserMonth(db, userId, targetMonth, correlation);
          summary.processed++;
          
          results.forEach(result => {
            if (result.status === 'match') summary.matches++;
            else if (result.status === 'mismatch') summary.mismatches++;
            else if (result.status === 'error') summary.errors++;
          });
          
          return { userId, success: true, results };
        } catch (error) {
          summary.errors++;
          console.error(`[Bulk Reconciliation] Failed for user ${userId}:`, error);
          return { userId, success: false, error: error.message };
        }
      });
      
      await Promise.all(batchPromises);
      
      // Log progress
      console.log(`[Bulk Reconciliation] Processed ${Math.min(i + batchSize, usersToReconcile.length)} / ${usersToReconcile.length} users`);
    }
    
    summary.processingTimeMs = Date.now() - startTime;
    console.log(`[Bulk Reconciliation] Completed: ${summary.processed} users, ${summary.matches} matches, ${summary.mismatches} mismatches, ${summary.errors} errors in ${summary.processingTimeMs}ms`);
    
    return summary;
  } catch (error) {
    console.error('[Bulk Reconciliation] Fatal error:', error);
    throw error;
  }
}

module.exports = {
  calculateRealTimeTotals,
  calculateRealTimeTotalsV3,
  updateMonthlyAggregates,
  reconcileUserMonth,
  bulkReconciliation,
  logReconciliation
};