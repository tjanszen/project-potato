"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.PostgresStorage = exports.db = void 0;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const schema_js_1 = require("../shared/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");

// Define runs table (V2 feature - tracks consecutive day runs)
// This is a JavaScript version of the runs table from schema.ts
const runs = (0, pg_core_1.pgTable)('runs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => schema_js_1.users.id, { onDelete: 'cascade' }),
    span: (0, pg_core_1.customType)({ dataType: () => "daterange" })('span').notNull(),
    dayCount: (0, pg_core_1.integer)('day_count').notNull(),
    active: (0, pg_core_1.boolean)('active').notNull().default(false),
    lastExtendedAt: (0, pg_core_1.timestamp)('last_extended_at').defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    // Generated helper columns
    startDate: (0, pg_core_1.date)('start_date'),
    endDate: (0, pg_core_1.date)('end_date'),
});
// Database connection
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
exports.db = (0, node_postgres_1.drizzle)(pool);
// Export pool for raw SQL queries (used by totals aggregation)
exports.pool = pool;
// PostgreSQL implementation
class PostgresStorage {
    async createUser(user) {
        const [newUser] = await exports.db.insert(schema_js_1.users).values({
            email: user.email,
            passwordHash: user.passwordHash,
            timezone: user.timezone,
        }).returning();
        return newUser;
    }
    async getUserByEmail(email) {
        const [user] = await exports.db.select().from(schema_js_1.users).where((0, drizzle_orm_1.eq)(schema_js_1.users.email, email));
        return user || null;
    }
    async getUserById(id) {
        const [user] = await exports.db.select().from(schema_js_1.users).where((0, drizzle_orm_1.eq)(schema_js_1.users.id, id));
        return user || null;
    }
    async getDayMarksForMonth(userId, month) {
        // month format: "2025-06"
        const startDate = `${month}-01`;
        const [y, m] = month.split('-').map(Number);
        const nextMonth = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2,'0')}-01`;
        
        const marks = await exports.db.select()
            .from(schema_js_1.dayMarks)
            .where((0, drizzle_orm_1.and)(
                (0, drizzle_orm_1.eq)(schema_js_1.dayMarks.userId, userId), 
                (0, drizzle_orm_1.eq)(schema_js_1.dayMarks.value, true), // Only get true values in v1
                (0, drizzle_orm_1.gte)(schema_js_1.dayMarks.localDate, startDate),
                (0, drizzle_orm_1.lt)(schema_js_1.dayMarks.localDate, nextMonth)
            ));
        
        return marks;
    }
    async getDayMark(userId, date) {
        const [mark] = await exports.db.select()
            .from(schema_js_1.dayMarks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.dayMarks.userId, userId), (0, drizzle_orm_1.eq)(schema_js_1.dayMarks.localDate, date)));
        return mark || null;
    }
    async markDay(dayMark) {
        // Use ON CONFLICT to handle idempotency
        const [mark] = await exports.db.insert(schema_js_1.dayMarks)
            .values(dayMark)
            .onConflictDoUpdate({
            target: [schema_js_1.dayMarks.userId, schema_js_1.dayMarks.localDate],
            set: {
                value: dayMark.value,
                updatedAt: new Date()
            }
        })
            .returning();
        
        // NEW: Auto-trigger run operations after marking to keep runs updated (V2)
        const { featureFlagService } = require('./feature-flags.js');
        if (featureFlagService.isEnabled('ff.potato.runs_v2')) {
            try {
                // PHASE 6B-1a: Call perform_run_merge BEFORE perform_run_extend
                // This handles gap-fill scenarios where marking a day bridges two existing runs
                console.log(`[DEBUG] Preview merge invoked for ${dayMark.userId} ${dayMark.localDate}`);
                await pool.query('SELECT perform_run_merge($1, $2)', [dayMark.userId, dayMark.localDate]);
                console.log(`[RUNS] Successfully merged runs for user ${dayMark.userId} date ${dayMark.localDate}`);
                
                // Then call perform_run_extend to handle extension/creation
                console.log(`[DEBUG] Preview extend invoked for ${dayMark.userId} ${dayMark.localDate}`);
                await pool.query('SELECT perform_run_extend($1, $2)', [dayMark.userId, dayMark.localDate]);
                console.log(`[RUNS] Successfully extended runs for user ${dayMark.userId} date ${dayMark.localDate}`);
            } catch (runsError) {
                console.warn(`[RUNS] Run operations failed for user ${dayMark.userId} date ${dayMark.localDate}:`, runsError.message);
                // Don't fail day marking - run operation failure is non-critical
            }
        }
        
        return mark;
    }
    async logClickEvent(event) {
        const [clickEvent] = await exports.db.insert(schema_js_1.clickEvents).values(event).returning();
        return clickEvent;
    }
    async getClickEventsForUser(userId, limit = 50) {
        const events = await exports.db.select()
            .from(schema_js_1.clickEvents)
            .where((0, drizzle_orm_1.eq)(schema_js_1.clickEvents.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.clickEvents.createdAt))
            .limit(limit);
        return events;
    }
    
    // Raw database access for aggregation functions
    async executeRawQuery(query, params = []) {
        return await pool.query(query, params);
    }
    
    // Get the raw pool for aggregation functions that need direct access
    getRawPool() {
        return pool;
    }
    
    // Runs operations (V2) - Ported from storage.ts
    
    /**
     * Perform run extend operation: add consecutive day to existing run or create new run
     * @param {string} userId - User ID
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object>} RunOperationResult-like object
     */
    async performRunExtend(userId, date) {
        console.log(`[RUNS] performRunExtend called for user ${userId}, date ${date}`);
        
        // First check if this date could fill a gap between two runs (Phase B: Merge logic)
        const mergeResult = await this.checkAndPerformMerge(userId, date);
        if (mergeResult) {
            return mergeResult;
        }
        
        // Find runs that could be extended by this date (adjacent runs)
        const adjacentRuns = await exports.db.select()
            .from(runs)
            .where((0, drizzle_orm_1.and)(
                (0, drizzle_orm_1.eq)(runs.userId, userId),
                (0, drizzle_orm_1.or)(
                    // Date is one day after end of run
                    (0, drizzle_orm_1.sql)`upper(${runs.span}) = ${date}::date`,
                    // Date is one day before start of run  
                    (0, drizzle_orm_1.sql)`lower(${runs.span}) = ${date}::date + interval '1 day'`,
                    // Date is within existing run (no-op case)
                    (0, drizzle_orm_1.sql)`${runs.span} @> ${date}::date`
                )
            ));

        if (adjacentRuns.length === 0) {
            // Create new run for isolated date
            console.log(`[RUNS] Creating new run for isolated date ${date}`);
            const newRun = await this.createSingleDateRun(userId, date);
            return {
                success: true,
                message: `Created new run for isolated date ${date}`,
                affectedRuns: [newRun],
                wasNoOp: false
            };
        }

        // Check if date is already within an existing run (idempotent no-op)
        const existingRunsContainingDate = await exports.db.select()
            .from(runs)
            .where((0, drizzle_orm_1.and)(
                (0, drizzle_orm_1.eq)(runs.userId, userId),
                (0, drizzle_orm_1.sql)`${runs.span} @> ${date}::date`
            ));

        if (existingRunsContainingDate.length > 0) {
            console.log(`[RUNS] Date ${date} already exists in run, no operation needed`);
            return {
                success: true,
                message: `Date ${date} already exists in run, no operation needed`,
                affectedRuns: existingRunsContainingDate,
                wasNoOp: true
            };
        }

        // Extend the run(s)
        const updatedRuns = [];
        for (const run of adjacentRuns) {
            console.log(`[RUNS] Extending run ${run.id} to include date ${date}`);
            const updatedRun = await this.extendRunWithDate(run.id, date);
            updatedRuns.push(updatedRun);
        }

        return {
            success: true,
            message: `Extended run(s) to include ${date}`,
            affectedRuns: updatedRuns,
            wasNoOp: false
        };
    }
    
    /**
     * Helper method to create a single-date run
     * @param {string} userId - User ID
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object>} Created run object
     */
    async createSingleDateRun(userId, date) {
        const [newRun] = await exports.db.insert(runs)
            .values({
                userId: userId,
                span: (0, drizzle_orm_1.sql)`daterange(${date}::date, (${date}::date + interval '1 day')::date, '[)')`,
                dayCount: 1,
                active: true
                // Note: start_date and end_date are generated columns, so we don't insert them
            })
            .returning();
        return newRun;
    }

    /**
     * Helper method to extend a run with a new date
     * @param {string} runId - Run ID to extend
     * @param {string} date - Date to add to run
     * @returns {Promise<Object>} Updated run object
     */
    async extendRunWithDate(runId, date) {
        // Use raw SQL with proper boundary construction (no illegal + operator)
        const extendQuery = `
            UPDATE runs
            SET span = daterange(
                    LEAST(lower(span), $1::date), 
                    GREATEST(upper(span), ($1::date + interval '1 day')::date), 
                    '[)'
                ),
                day_count = (GREATEST(upper(span), ($1::date + interval '1 day')::date) - LEAST(lower(span), $1::date)),
                active = true,
                last_extended_at = NOW(),
                updated_at = NOW()
            WHERE id = $2
            RETURNING *;
        `;
        
        const result = await pool.query(extendQuery, [date, runId]);
        return result.rows[0];
    }
    
    /**
     * Check if a date fills a gap between two runs and perform merge if so (Phase B)
     * @param {string} userId - User ID
     * @param {string} date - Date to check for gap filling
     * @returns {Promise<Object|null>} Merge result or null if no merge needed
     */
    async checkAndPerformMerge(userId, date) {
        console.log(`[RUNS] Checking for merge opportunity at date ${date}`);
        
        // Find run that ends one day before this date
        const beforeRun = await exports.db.select()
            .from(runs)
            .where((0, drizzle_orm_1.and)(
                (0, drizzle_orm_1.eq)(runs.userId, userId),
                (0, drizzle_orm_1.sql)`upper(${runs.span}) = ${date}::date`
            ));

        // Find run that starts one day after this date  
        const afterRun = await exports.db.select()
            .from(runs)
            .where((0, drizzle_orm_1.and)(
                (0, drizzle_orm_1.eq)(runs.userId, userId),
                (0, drizzle_orm_1.sql)`lower(${runs.span}) = ${date}::date + interval '1 day'`
            ));

        if (beforeRun.length === 0 || afterRun.length === 0) {
            console.log(`[RUNS] No merge opportunity found - missing before (${beforeRun.length}) or after (${afterRun.length}) run`);
            return null; // No merge opportunity
        }

        console.log(`[RUNS] Found merge opportunity! Merging runs by filling gap at ${date}`);
        return await this.performRunMerge(userId, date, beforeRun[0], afterRun[0]);
    }
    
    /**
     * Perform run merge operation: merge two runs by filling gap between them (Phase B)
     * @param {string} userId - User ID
     * @param {string} date - Gap date to fill
     * @param {Object} beforeRun - Run that ends before the gap
     * @param {Object} afterRun - Run that starts after the gap
     * @returns {Promise<Object>} RunOperationResult-like object
     */
    async performRunMerge(userId, date, beforeRun, afterRun) {
        console.log(`[RUNS] performRunMerge: merging run ${beforeRun.id} and ${afterRun.id} via gap date ${date}`);
        
        // Check if date is already within an existing run (idempotent no-op)
        const existingRunsContainingDate = await exports.db.select()
            .from(runs)
            .where((0, drizzle_orm_1.and)(
                (0, drizzle_orm_1.eq)(runs.userId, userId),
                (0, drizzle_orm_1.sql)`${runs.span} @> ${date}::date`
            ));

        if (existingRunsContainingDate.length > 0) {
            console.log(`[RUNS] Date ${date} already exists in run, merge not needed (idempotent)`);
            return {
                success: true,
                message: `Date ${date} already exists in run, merge not needed`,
                affectedRuns: existingRunsContainingDate,
                wasNoOp: true
            };
        }
        
        // Use transaction to avoid EXCLUDE constraint violations during merge
        const client = await pool.connect();
        let mergedRun;
        
        try {
            await client.query('BEGIN');
            
            // Delete the second run first to avoid overlap constraint violations
            await client.query('DELETE FROM runs WHERE id = $1', [afterRun.id]);
            
            // Update the first run with properly computed span and day count
            const mergeQuery = `
                UPDATE runs 
                SET span = daterange(
                        LEAST(lower($1::daterange), lower($2::daterange)),
                        GREATEST(upper($1::daterange), upper($2::daterange)), 
                        '[)'
                    ),
                    day_count = (GREATEST(upper($1::daterange), upper($2::daterange)) - LEAST(lower($1::daterange), lower($2::daterange))),
                    active = ($3::boolean OR $4::boolean),
                    last_extended_at = NOW(),
                    updated_at = NOW()
                WHERE id = $5
                RETURNING *;
            `;
            
            const mergeResult = await client.query(mergeQuery, [
                beforeRun.span, 
                afterRun.span, 
                beforeRun.active, 
                afterRun.active, 
                beforeRun.id
            ]);
            
            if (mergeResult.rows.length === 0) {
                throw new Error('Failed to merge runs - update returned no rows');
            }
            
            mergedRun = mergeResult.rows[0];
            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
        console.log(`[RUNS] Successfully merged runs: new day_count = ${mergedRun.dayCount}, span = ${mergedRun.span}`);

        return {
            success: true,
            message: `Merged runs by filling gap at ${date}`,
            affectedRuns: [mergedRun],
            wasNoOp: false
        };
    }
    
    /**
     * Phase C: Backfill/Rebuild operations - Port from storage.ts
     */
    
    /**
     * Create backup of user's runs before rebuild
     * @param {string} userId - User ID
     * @returns {Promise<Object>} RunBackup object with runs and metadata
     */
    async backupUserRuns(userId) {
        const userRuns = await exports.db.select().from(runs).where((0, drizzle_orm_1.eq)(runs.userId, userId));
        const activeRun = userRuns.find(run => run.active);
        const totalDays = userRuns.reduce((sum, run) => sum + run.dayCount, 0);

        return {
            userId,
            timestamp: new Date(),
            runs: userRuns,
            metadata: {
                totalRuns: userRuns.length,
                totalDays,
                activeRun: !!activeRun,
                backupReason: 'Pre-rebuild backup'
            }
        };
    }
    
    /**
     * Group consecutive dates into runs
     * @param {string[]} dates - Array of date strings in YYYY-MM-DD format
     * @returns {Array<Object>} Array of run objects with startDate, endDate, dayCount
     */
    groupConsecutiveDates(dates) {
        if (dates.length === 0) return [];

        const runs = [];
        let currentRun = {
            startDate: dates[0],
            endDate: dates[0],
            dayCount: 1
        };

        for (let i = 1; i < dates.length; i++) {
            const currentDate = new Date(dates[i]);
            const prevDate = new Date(dates[i - 1]);
            const dayDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

            if (dayDiff === 1) {
                // Consecutive day - extend current run
                currentRun.endDate = dates[i];
                currentRun.dayCount++;
            } else {
                // Gap found - finish current run and start new one
                runs.push({ ...currentRun });
                currentRun = {
                    startDate: dates[i],
                    endDate: dates[i],
                    dayCount: 1
                };
            }
        }

        // Add the last run
        runs.push(currentRun);
        return runs;
    }
    
    /**
     * Rebuild user runs from their day_marks data (deterministic reconstruction)
     * @param {string} userId - User ID
     * @param {string} fromDate - Optional start date filter (YYYY-MM-DD)
     * @param {string} toDate - Optional end date filter (YYYY-MM-DD)
     * @returns {Promise<Object>} RebuildResult with success, counts, and metrics
     */
    async rebuildUserRuns(userId, fromDate = null, toDate = null) {
        const operationId = `rebuild-${userId}-${Date.now()}`;
        const startTime = performance.now();
        
        try {
            console.log(`[REBUILD] Starting rebuild for user ${userId}, operation ${operationId}`);
            
            // Step 1: Backup existing runs before rebuild
            const backup = await this.backupUserRuns(userId);
            console.log(`[REBUILD] Backed up ${backup.metadata.totalRuns} existing runs`);
            
            // Step 2: Get user's day marks for the specified date range
            let dayMarksQuery = `
                SELECT local_date as date
                FROM day_marks
                WHERE user_id = $1
                AND value = true
            `;
            const queryParams = [userId];
            
            if (fromDate) {
                dayMarksQuery += ` AND local_date >= $${queryParams.length + 1}`;
                queryParams.push(fromDate);
            }
            if (toDate) {
                dayMarksQuery += ` AND local_date <= $${queryParams.length + 1}`;
                queryParams.push(toDate);
            }
            
            dayMarksQuery += ` ORDER BY local_date`;
            
            const dayMarksResult = await pool.query(dayMarksQuery, queryParams);
            const dayMarks = dayMarksResult.rows.map(row => row.date);
            console.log(`[REBUILD] Found ${dayMarks.length} marked days to process`);

            // Step 3: Delete existing runs in the affected date range
            let deleteQuery = `DELETE FROM runs WHERE user_id = $1`;
            const deleteParams = [userId];
            
            if (fromDate) {
                deleteQuery += ` AND lower(span) >= $${deleteParams.length + 1}`;
                deleteParams.push(fromDate);
            }
            if (toDate) {
                deleteQuery += ` AND upper(span) <= $${deleteParams.length + 1}`;
                deleteParams.push(toDate);
            }
            
            const deleteResult = await pool.query(deleteQuery, deleteParams);
            const runsDeleted = deleteResult.rowCount || 0;
            console.log(`[REBUILD] Deleted ${runsDeleted} existing runs`);

            // Step 4: Group consecutive dates into runs
            const processedRuns = this.groupConsecutiveDates(dayMarks);
            console.log(`[REBUILD] Grouped dates into ${processedRuns.length} runs`);

            // Step 5: Insert new runs
            let runsCreated = 0;
            const today = new Date().toISOString().split('T')[0];

            for (const run of processedRuns) {
                const isActive = run.endDate === today;
                
                const insertQuery = `
                    INSERT INTO runs (user_id, span, day_count, active, last_extended_at, created_at, updated_at)
                    VALUES ($1, daterange($2::date, ($3::date + interval '1 day')::date, '[)'), (upper(daterange($2::date, ($3::date + interval '1 day')::date, '[)')) - lower(daterange($2::date, ($3::date + interval '1 day')::date, '[)'))), $4, NOW(), NOW(), NOW())
                `;
                
                await pool.query(insertQuery, [
                    userId,
                    run.startDate,
                    run.endDate,
                    isActive
                ]);
                
                runsCreated++;
            }
            
            console.log(`[REBUILD] Created ${runsCreated} new runs`);

            const endTime = performance.now();
            const durationMs = Math.round((endTime - startTime) * 100) / 100;

            // Step 6: Validate invariants (simplified for Phase C)
            const overlapCheckQuery = `
                SELECT COUNT(*) as overlap_count FROM runs a 
                JOIN runs b ON a.user_id = b.user_id AND a.id != b.id AND a.span && b.span
                WHERE a.user_id = $1
            `;
            const overlapResult = await pool.query(overlapCheckQuery, [userId]);
            const overlappingRuns = parseInt(overlapResult.rows[0].overlap_count);
            
            const multipleActiveQuery = `
                SELECT COUNT(*) as active_count FROM runs 
                WHERE user_id = $1 AND active = true
            `;
            const activeResult = await pool.query(multipleActiveQuery, [userId]);
            const activeCount = parseInt(activeResult.rows[0].active_count);
            const multipleActiveRuns = Math.max(0, activeCount - 1); // Allow 1 active run

            const invariantViolations = overlappingRuns + multipleActiveRuns;

            const result = {
                success: invariantViolations === 0,
                userId,
                operationId,
                runsDeleted,
                runsCreated,
                totalDaysProcessed: dayMarks.length,
                durationMs,
                fromDate,
                toDate,
                invariantViolations,
                backup
            };
            
            console.log(`[REBUILD] Completed rebuild: ${JSON.stringify(result)}`);
            return result;
            
        } catch (error) {
            console.error(`[REBUILD] Failed for user ${userId}:`, error);
            return {
                success: false,
                userId,
                operationId,
                runsDeleted: 0,
                runsCreated: 0,
                totalDaysProcessed: 0,
                durationMs: performance.now() - startTime,
                fromDate,
                toDate,
                invariantViolations: -1,
                error: error.message
            };
        }
    }
    
    /**
     * Admin backfill function: rebuild runs for all users with day_marks
     * @param {Object} config - Configuration options
     * @returns {Promise<Object>} BulkRebuildResult with overall statistics
     */
    async backfillAllUserRuns(config = {}) {
        const {
            batchSize = 10,
            dryRun = false,
            skipBackup = false
        } = config;
        
        const operationId = `backfill-all-${Date.now()}`;
        const startTime = performance.now();
        
        console.log(`[BACKFILL] Starting bulk backfill operation ${operationId}, dryRun=${dryRun}`);
        
        try {
            // Get all users with day_marks
            const usersQuery = `
                SELECT DISTINCT user_id 
                FROM day_marks 
                WHERE value = true
                ORDER BY user_id
            `;
            const usersResult = await pool.query(usersQuery);
            const userIds = usersResult.rows.map(row => row.user_id);
            
            console.log(`[BACKFILL] Found ${userIds.length} users with day_marks to process`);
            
            if (dryRun) {
                return {
                    operationId,
                    totalUsers: userIds.length,
                    completedUsers: 0,
                    failedUsers: 0,
                    skippedUsers: userIds.length,
                    averageDurationMs: 0,
                    totalDurationMs: 0,
                    invariantViolations: 0,
                    errors: [],
                    dryRun: true,
                    usersToProcess: userIds
                };
            }
            
            const results = {
                operationId,
                totalUsers: userIds.length,
                completedUsers: 0,
                failedUsers: 0,
                skippedUsers: 0,
                averageDurationMs: 0,
                totalDurationMs: 0,
                invariantViolations: 0,
                errors: []
            };
            
            // Process users in batches
            for (let i = 0; i < userIds.length; i += batchSize) {
                const batch = userIds.slice(i, i + batchSize);
                console.log(`[BACKFILL] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(userIds.length/batchSize)}: ${batch.length} users`);
                
                // Process batch sequentially to avoid overwhelming the database
                for (const userId of batch) {
                    try {
                        const rebuildResult = await this.rebuildUserRuns(userId);
                        
                        if (rebuildResult.success) {
                            results.completedUsers++;
                            results.invariantViolations += rebuildResult.invariantViolations;
                            console.log(`[BACKFILL] ✅ User ${userId}: ${rebuildResult.runsCreated} runs created from ${rebuildResult.totalDaysProcessed} days`);
                        } else {
                            results.failedUsers++;
                            results.errors.push({
                                userId,
                                error: rebuildResult.error || 'Unknown error',
                                timestamp: new Date()
                            });
                            console.log(`[BACKFILL] ❌ User ${userId}: ${rebuildResult.error}`);
                        }
                        
                    } catch (error) {
                        results.failedUsers++;
                        results.errors.push({
                            userId,
                            error: error.message,
                            timestamp: new Date()
                        });
                        console.error(`[BACKFILL] ❌ User ${userId} failed:`, error);
                    }
                }
                
                // Small delay between batches to avoid overwhelming the database
                if (i + batchSize < userIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            const endTime = performance.now();
            results.totalDurationMs = Math.round((endTime - startTime) * 100) / 100;
            results.averageDurationMs = results.completedUsers > 0 ? results.totalDurationMs / results.completedUsers : 0;
            
            console.log(`[BACKFILL] Completed: ${results.completedUsers}/${results.totalUsers} users processed successfully`);
            console.log(`[BACKFILL] Errors: ${results.failedUsers}, Invariant violations: ${results.invariantViolations}`);
            
            return results;
            
        } catch (error) {
            console.error(`[BACKFILL] Bulk operation failed:`, error);
            throw error;
        }
    }
}
exports.PostgresStorage = PostgresStorage;
// Export singleton instance
exports.storage = new PostgresStorage();
