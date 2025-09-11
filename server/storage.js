"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.PostgresStorage = exports.db = void 0;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const schema_js_1 = require("../shared/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
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
}
exports.PostgresStorage = PostgresStorage;
// Export singleton instance
exports.storage = new PostgresStorage();
