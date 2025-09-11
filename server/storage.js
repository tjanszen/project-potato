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
        // CRITICAL FIX: Remove race-prone pre-check, use RETURNING to get old value atomically
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
        
        // Wire runs calculation into day marking flow (Phase A + Phase D)
        // Both operations are idempotent, so we can call them based on current state
        try {
            if (dayMark.value === true) {
                // Marking day - extend or merge runs (idempotent)
                console.log(`[RUNS] Triggering run extension for user ${dayMark.userId}, date ${dayMark.localDate}`);
                await this.performRunExtend(dayMark.userId, dayMark.localDate);
                console.log(`[RUNS] Successfully processed run extension for ${dayMark.localDate}`);
            } else {
                // Unmarking day - split or shrink runs (idempotent)
                console.log(`[RUNS] Triggering run split/removal for user ${dayMark.userId}, date ${dayMark.localDate}`);
                await this.performRunSplit(dayMark.userId, dayMark.localDate);
                console.log(`[RUNS] Successfully processed run split/removal for ${dayMark.localDate}`);
            }
        } catch (runsError) {
            console.warn(`[RUNS] Runs calculation failed for user ${dayMark.userId}, date ${dayMark.localDate}:`, runsError.message);
            // Don't fail day marking - runs calculation failure is non-critical
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
    
    // Phase C: Backfill/Rebuild operations
    
    /**
     * Backup user runs before rebuild operations
     * @param {string} userId - User ID to backup
     * @returns {Promise<Object>} RunBackup object
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
     * Rebuild user runs from day_marks data
     * @param {string} userId - User ID to rebuild
     * @param {string} fromDate - Optional start date filter
     * @param {string} toDate - Optional end date filter
     * @returns {Promise<Object>} RebuildResult object
     */
    async rebuildUserRuns(userId, fromDate = null, toDate = null) {
        const operationId = require('crypto').randomUUID();
        const startTime = performance.now();
        
        try {
            // Step 1: Backup existing runs before rebuild
            const backup = await this.backupUserRuns(userId);
            
            // Step 2: Get user's day marks for the specified date range
            let dayMarksQuery = `
                SELECT local_date
                FROM day_marks
                WHERE user_id = $1
                AND value = true
            `;
            const queryParams = [userId];
            let paramIndex = 2;
            
            if (fromDate) {
                dayMarksQuery += ` AND local_date >= $${paramIndex}`;
                queryParams.push(fromDate);
                paramIndex++;
            }
            if (toDate) {
                dayMarksQuery += ` AND local_date <= $${paramIndex}`;
                queryParams.push(toDate);
                paramIndex++;
            }
            
            dayMarksQuery += ' ORDER BY local_date';

            const dayMarksResult = await pool.query(dayMarksQuery, queryParams);
            const dayMarks = dayMarksResult.rows.map(row => row.local_date);

            // Step 3: Delete existing runs in the affected date range
            // CRITICAL FIX: Use daterange intersection to handle partial overlaps
            let deleteQuery = `DELETE FROM runs WHERE user_id = $1`;
            const deleteParams = [userId];
            let deleteParamIndex = 2;
            
            if (fromDate && toDate) {
                // Delete any run whose span intersects the rebuild window
                deleteQuery += ` AND span && daterange($${deleteParamIndex}::date, ($${deleteParamIndex + 1}::date + interval '1 day')::date, '[)')`;
                deleteParams.push(fromDate, toDate);
                deleteParamIndex += 2;
            } else if (fromDate) {
                // Delete runs that start at or after fromDate
                deleteQuery += ` AND lower(span) >= $${deleteParamIndex}::date`;
                deleteParams.push(fromDate);
                deleteParamIndex++;
            } else if (toDate) {
                // Delete runs that end at or before toDate
                deleteQuery += ` AND upper(span) <= ($${deleteParamIndex}::date + interval '1 day')::date`;
                deleteParams.push(toDate);
                deleteParamIndex++;
            }
            
            const deleteResult = await pool.query(deleteQuery, deleteParams);
            const runsDeleted = deleteResult.rowCount || 0;

            // Step 4: Group consecutive dates into runs
            const processedRuns = this.groupConsecutiveDates(dayMarks);

            // Step 5: Insert new runs
            let runsCreated = 0;
            const today = new Date().toISOString().split('T')[0];
            const uuid = require('crypto').randomUUID;

            for (const run of processedRuns) {
                const isActive = run.endDate === today;
                
                const insertQuery = `
                    INSERT INTO runs (id, user_id, span, day_count, active, last_extended_at, created_at, updated_at)
                    VALUES ($1, $2, daterange($3::date, ($4::date + interval '1 day')::date, '[)'), $5, $6, NOW(), NOW(), NOW())
                `;
                
                await pool.query(insertQuery, [
                    uuid(),
                    userId,
                    run.startDate,
                    run.endDate,
                    run.dayCount,
                    isActive
                ]);
                
                runsCreated++;
            }

            const endTime = performance.now();
            const durationMs = Math.round((endTime - startTime) * 100) / 100;

            const result = {
                success: true,
                userId,
                operationId,
                runsDeleted,
                runsCreated,
                totalDaysProcessed: dayMarks.length,
                durationMs,
                fromDate,
                toDate,
                backup
            };

            console.log(`[REBUILD] User ${userId}: deleted ${runsDeleted} runs, created ${runsCreated} runs from ${dayMarks.length} days in ${durationMs}ms`);
            return result;

        } catch (error) {
            const endTime = performance.now();
            const durationMs = Math.round((endTime - startTime) * 100) / 100;

            console.error(`[REBUILD] Failed for user ${userId}:`, error.message);
            return {
                success: false,
                userId,
                operationId,
                runsDeleted: 0,
                runsCreated: 0,
                totalDaysProcessed: 0,
                durationMs,
                fromDate,
                toDate,
                error: error.message
            };
        }
    }
    
    /**
     * Helper method to chunk array into batches
     * @param {Array} array - Array to chunk
     * @param {number} size - Batch size
     * @returns {Array<Array>} Array of batches
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    /**
     * Rebuild runs for all users with day_marks (bulk operation)
     * @param {string[]} userIds - Optional array of specific user IDs to rebuild
     * @param {Object} config - Optional configuration
     * @returns {Promise<Object>} BulkRebuildResult object
     */
    async rebuildAllUserRuns(userIds = null, config = {}) {
        const defaultConfig = {
            batchSize: 10,
            maxWorkers: 5,
            dryRun: false,
            skipBackup: false
        };
        
        const finalConfig = { ...defaultConfig, ...config };
        const operationId = require('crypto').randomUUID();
        const startTime = performance.now();
        
        // Get all users with day_marks if userIds not provided
        if (!userIds) {
            const usersQuery = `
                SELECT DISTINCT user_id 
                FROM day_marks 
                WHERE value = true
            `;
            const usersResult = await pool.query(usersQuery);
            userIds = usersResult.rows.map(row => row.user_id);
        }
        
        const result = {
            operationId,
            totalUsers: userIds.length,
            completedUsers: 0,
            failedUsers: 0,
            skippedUsers: 0,
            averageDurationMs: 0,
            totalDurationMs: 0,
            errors: []
        };

        if (finalConfig.dryRun) {
            console.log(`[DRY RUN] Would rebuild ${userIds.length} users`);
            return result;
        }

        // Process users in batches
        const batches = this.chunkArray(userIds, finalConfig.batchSize);
        const durations = [];

        for (const batch of batches) {
            const batchPromises = batch.map(async (userId) => {
                try {
                    const rebuildResult = await this.rebuildUserRuns(
                        userId,
                        finalConfig.fromDate,
                        finalConfig.toDate
                    );
                    
                    durations.push(rebuildResult.durationMs);
                    
                    if (rebuildResult.success) {
                        result.completedUsers++;
                    } else {
                        result.failedUsers++;
                        result.errors.push({
                            userId,
                            error: rebuildResult.error || 'Rebuild failed',
                            timestamp: new Date()
                        });
                    }
                    
                } catch (error) {
                    result.failedUsers++;
                    result.errors.push({
                        userId,
                        error: error.message,
                        timestamp: new Date()
                    });
                }
            });

            await Promise.all(batchPromises);
        }

        const endTime = performance.now();
        result.totalDurationMs = Math.round((endTime - startTime) * 100) / 100;
        result.averageDurationMs = durations.length > 0 
            ? Math.round((durations.reduce((sum, d) => sum + d, 0) / durations.length) * 100) / 100
            : 0;

        console.log(`[BULK REBUILD] Completed: ${result.completedUsers}, Failed: ${result.failedUsers}, Total: ${result.totalUsers} in ${result.totalDurationMs}ms`);
        return result;
    }
    
    // Phase D: Split/Remove-Day operations
    
    /**
     * Perform run split operation: remove a day from run, splitting if necessary
     * @param {string} userId - User ID
     * @param {string} date - Date to remove in YYYY-MM-DD format
     * @returns {Promise<Object>} RunOperationResult-like object
     */
    async performRunSplit(userId, date) {
        console.log(`[RUNS] performRunSplit called for user ${userId}, date ${date}`);
        
        // Find run containing this date
        const containingRuns = await exports.db.select()
            .from(runs)
            .where((0, drizzle_orm_1.and)(
                (0, drizzle_orm_1.eq)(runs.userId, userId),
                (0, drizzle_orm_1.sql)`${runs.span} @> ${date}::date`
            ));

        if (containingRuns.length === 0) {
            console.log(`[RUNS] Date ${date} not found in any run, no operation needed`);
            return {
                success: true,
                message: `Date ${date} not found in any run, no operation needed`,
                affectedRuns: [],
                wasNoOp: true
            };
        }

        const containingRun = containingRuns[0];
        console.log(`[RUNS] Found run ${containingRun.id} containing date ${date}, day_count: ${containingRun.dayCount}`);

        // Use raw SQL to check position in run since we need precise date arithmetic
        const positionQuery = `
            SELECT 
                CASE 
                    WHEN lower(span) = $1::date THEN 'start'
                    WHEN upper(span) = ($1::date + interval '1 day')::date THEN 'end'
                    ELSE 'middle'
                END as position
            FROM runs 
            WHERE id = $2
        `;
        
        const positionResult = await pool.query(positionQuery, [date, containingRun.id]);
        const position = positionResult.rows[0]?.position;

        if (position === 'start') {
            // Remove from start of run
            if (containingRun.dayCount === 1) {
                // Delete single-day run
                console.log(`[RUNS] Deleting single-day run at ${date}`);
                await exports.db.delete(runs).where((0, drizzle_orm_1.eq)(runs.id, containingRun.id));
                return {
                    success: true,
                    message: `Deleted single-day run at ${date}`,
                    affectedRuns: [],
                    wasNoOp: false
                };
            } else {
                // Shrink run from start
                console.log(`[RUNS] Shrinking run from start, removing ${date}`);
                const shrinkQuery = `
                    UPDATE runs
                    SET span = daterange(($1::date + interval '1 day')::date, upper(span), '[)'),
                        day_count = day_count - 1,
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING *;
                `;
                
                const shrinkResult = await pool.query(shrinkQuery, [date, containingRun.id]);
                const updatedRun = shrinkResult.rows[0];
                
                return {
                    success: true,
                    message: `Removed ${date} from start of run`,
                    affectedRuns: [updatedRun],
                    wasNoOp: false
                };
            }
        } else if (position === 'end') {
            // Remove from end of run
            console.log(`[RUNS] Shrinking run from end, removing ${date}`);
            const shrinkQuery = `
                UPDATE runs
                SET span = daterange(lower(span), $1::date, '[)'),
                    day_count = day_count - 1,
                    active = false,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *;
            `;
            
            const shrinkResult = await pool.query(shrinkQuery, [date, containingRun.id]);
            const updatedRun = shrinkResult.rows[0];
            
            return {
                success: true,
                message: `Removed ${date} from end of run`,
                affectedRuns: [updatedRun],
                wasNoOp: false
            };
        } else {
            // Split run in middle
            console.log(`[RUNS] Splitting run in middle, removing ${date}`);
            const originalRun = containingRun;
            const uuid = require('crypto').randomUUID;
            
            // Use transaction to avoid inconsistent state during split
            // CRITICAL FIX: Change order to delete-then-insert to prevent overlaps
            const client = await pool.connect();
            let firstRun, secondRun;
            
            try {
                await client.query('BEGIN');
                
                // First create the second run before modifying the original
                const secondPartQuery = `
                    INSERT INTO runs (id, user_id, span, day_count, active, last_extended_at, created_at, updated_at)
                    VALUES ($1, $2, daterange(($3::date + interval '1 day')::date, upper($4::daterange), '[)'), 
                            (upper($4::daterange) - ($3::date + interval '1 day')::date), $5, NOW(), NOW(), NOW())
                    RETURNING *;
                `;
                
                const secondResult = await client.query(secondPartQuery, [
                    uuid(),
                    userId,
                    date,
                    originalRun.span,
                    originalRun.active
                ]);
                secondRun = secondResult.rows[0];

                // Then update the original run to first part (this prevents span overlap)
                const firstPartQuery = `
                    UPDATE runs
                    SET span = daterange(lower(span), $1::date, '[)'),
                        day_count = ($1::date - lower(span)),
                        active = false,
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING *;
                `;
                
                const firstResult = await client.query(firstPartQuery, [date, originalRun.id]);
                firstRun = firstResult.rows[0];
                
                await client.query('COMMIT');
                
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
            
            console.log(`[RUNS] Successfully split run: first_run day_count = ${firstRun.dayCount}, second_run day_count = ${secondRun.dayCount}`);

            return {
                success: true,
                message: `Split run by removing ${date} from middle`,
                affectedRuns: [firstRun, secondRun],
                wasNoOp: false
            };
        }
    }
}
exports.PostgresStorage = PostgresStorage;
// Export singleton instance
exports.storage = new PostgresStorage();
