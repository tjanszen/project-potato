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
        
        // NEW: Wire runs calculation into day marking flow (Phase A)
        try {
            console.log(`[RUNS] Triggering runs calculation for user ${dayMark.userId}, date ${dayMark.localDate}`);
            await this.performRunExtend(dayMark.userId, dayMark.localDate);
            console.log(`[RUNS] Successfully processed runs calculation for ${dayMark.localDate}`);
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
}
exports.PostgresStorage = PostgresStorage;
// Export singleton instance
exports.storage = new PostgresStorage();
