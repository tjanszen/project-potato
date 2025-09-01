"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertClickEventSchema = exports.insertDayMarkSchema = exports.insertUserSchema = exports.clickEvents = exports.dayMarks = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Users table
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    timezone: (0, pg_core_1.text)('timezone').notNull(), // e.g., "America/New_York"
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// Day marks table (deduped current state)
exports.dayMarks = (0, pg_core_1.pgTable)('day_marks', {
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    date: (0, pg_core_1.date)('date').notNull(),
    value: (0, pg_core_1.boolean)('value').notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (table) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [table.userId, table.date] }),
    dateCheck: (0, pg_core_1.check)('date_check', (0, drizzle_orm_1.sql) `date >= DATE '2025-01-01'`),
    valueCheck: (0, pg_core_1.check)('value_check', (0, drizzle_orm_1.sql) `value = TRUE`), // v1 only stores TRUE
}));
// Click events table (append-only event log)
exports.clickEvents = (0, pg_core_1.pgTable)('click_events', {
    clickId: (0, pg_core_1.uuid)('click_id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    date: (0, pg_core_1.date)('date').notNull(),
    value: (0, pg_core_1.boolean)('value').notNull(),
    userLocalDate: (0, pg_core_1.date)('user_local_date').notNull(),
    userTimezone: (0, pg_core_1.text)('user_timezone').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (table) => ({
    dateCheck: (0, pg_core_1.check)('date_check', (0, drizzle_orm_1.sql) `date >= DATE '2025-01-01'`),
    valueCheck: (0, pg_core_1.check)('value_check', (0, drizzle_orm_1.sql) `value = TRUE`), // v1 only stores TRUE
}));
// Zod schemas for validation
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    id: true,
    createdAt: true,
}).extend({
    password: zod_1.z.string().min(1, 'Password is required'),
}).omit({
    passwordHash: true,
});
exports.insertDayMarkSchema = (0, drizzle_zod_1.createInsertSchema)(exports.dayMarks).omit({
    updatedAt: true,
});
exports.insertClickEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.clickEvents).omit({
    clickId: true,
    createdAt: true,
});
