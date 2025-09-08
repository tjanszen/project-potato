// Phase 7A-3: Totals Invalidation Strategy
// Invalidates and updates totals when runs data changes

const { updateMonthlyAggregates } = require('./totals-aggregation');

/**
 * Invalidate totals for a user when their runs change
 * @param {Object} storage - Storage interface with database access
 * @param {string} userId - User ID whose totals need invalidation
 * @param {string} yearMonth - Optional specific year-month to invalidate (YYYY-MM format)
 * @returns {Promise<Object>} Invalidation result
 */
async function invalidateUserTotals(storage, userId, yearMonth = null) {
  const startTime = Date.now();
  
  try {
    const dbPool = storage.getRawPool ? storage.getRawPool() : null;
    if (!dbPool) {
      throw new Error('Database pool not available for invalidation');
    }

    // If specific month provided, invalidate only that month
    if (yearMonth) {
      const result = await updateMonthlyAggregates(dbPool, userId, yearMonth);
      const processingTime = Date.now() - startTime;
      
      console.log(`[Invalidation] User ${userId} month ${yearMonth} updated in ${processingTime}ms`);
      
      return {
        userId,
        invalidatedMonths: [yearMonth],
        processingTimeMs: processingTime,
        results: [{ month: yearMonth, success: true, result }]
      };
    }

    // Otherwise, invalidate current month and any months with recent activity
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get months with recent day marks (last 30 days)
    const recentMonthsQuery = `
      SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') as year_month
      FROM day_marks 
      WHERE user_id = $1 
      AND date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY year_month
    `;
    
    const recentMonthsResult = await dbPool.query(recentMonthsQuery, [userId]);
    const monthsToInvalidate = recentMonthsResult.rows.map(row => row.year_month);
    
    // Always include current month
    if (!monthsToInvalidate.includes(currentMonth)) {
      monthsToInvalidate.push(currentMonth);
    }

    console.log(`[Invalidation] User ${userId}: Invalidating ${monthsToInvalidate.length} months`);

    // Update aggregates for affected months
    const results = [];
    for (const month of monthsToInvalidate) {
      try {
        const result = await updateMonthlyAggregates(dbPool, userId, month);
        results.push({ month, success: true, result });
      } catch (error) {
        console.error(`[Invalidation] User ${userId} month ${month} failed:`, error);
        results.push({ month, success: false, error: error.message });
      }
    }

    const processingTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    
    console.log(`[Invalidation] User ${userId}: Updated ${successCount}/${monthsToInvalidate.length} months in ${processingTime}ms`);

    return {
      userId,
      invalidatedMonths: monthsToInvalidate,
      successfulUpdates: successCount,
      failedUpdates: monthsToInvalidate.length - successCount,
      processingTimeMs: processingTime,
      results
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Invalidation] User ${userId} failed:`, error);
    
    return {
      userId,
      success: false,
      error: error.message,
      processingTimeMs: processingTime
    };
  }
}

/**
 * Middleware to invalidate totals after runs operations
 * Usage: Add as middleware after any endpoint that modifies runs data
 * @param {Object} options - Invalidation options
 * @returns {Function} Express middleware function
 */
function invalidateTotalsMiddleware(options = {}) {
  return async (req, res, next) => {
    // Only run if the response was successful
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        // Get storage from the app context
        const { storage } = require('./storage.js');
        
        const userId = req.session?.userId;
        if (userId) {
          // Run invalidation asynchronously to not block response
          setImmediate(async () => {
            try {
              await invalidateUserTotals(storage, userId, options.yearMonth);
            } catch (error) {
              console.error('[Invalidation] Async invalidation failed:', error);
            }
          });
        }
      } catch (error) {
        console.error('[Invalidation] Middleware error:', error);
        // Don't block the response even if invalidation fails
      }
    }
    next();
  };
}

/**
 * Express route handler to manually trigger totals invalidation
 * Useful for admin operations or recovery scenarios
 */
async function handleManualInvalidation(req, res) {
  try {
    const { userId, yearMonth } = req.body;
    const { storage } = require('./storage.js');
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required',
        usage: 'POST { "userId": "uuid", "yearMonth": "2025-09" }' 
      });
    }

    const result = await invalidateUserTotals(storage, userId, yearMonth);
    
    res.json({
      message: 'Totals invalidation completed',
      result
    });

  } catch (error) {
    console.error('[Invalidation] Manual invalidation error:', error);
    res.status(500).json({ 
      error: 'Invalidation failed',
      message: error.message 
    });
  }
}

module.exports = {
  invalidateUserTotals,
  invalidateTotalsMiddleware,
  handleManualInvalidation
};