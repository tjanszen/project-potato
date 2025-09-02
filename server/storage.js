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
        const endDate = `${month}-31`; // Simplified - covers all possible month lengths
        const marks = await exports.db.select()
            .from(schema_js_1.dayMarks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.dayMarks.userId, userId), (0, drizzle_orm_1.eq)(schema_js_1.dayMarks.value, true) // Only get true values in v1
        ));
        // Filter by month on the application side for simplicity
        return marks.filter(mark => mark.date.startsWith(month));
    }
    async getDayMark(userId, date) {
        const [mark] = await exports.db.select()
            .from(schema_js_1.dayMarks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.dayMarks.userId, userId), (0, drizzle_orm_1.eq)(schema_js_1.dayMarks.date, date)));
        return mark || null;
    }
    async markDay(dayMark) {
        // Use ON CONFLICT to handle idempotency
        const [mark] = await exports.db.insert(schema_js_1.dayMarks)
            .values(dayMark)
            .onConflictDoUpdate({
            target: [schema_js_1.dayMarks.userId, schema_js_1.dayMarks.date],
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
}
exports.PostgresStorage = PostgresStorage;
// Export singleton instance
exports.storage = new PostgresStorage();
