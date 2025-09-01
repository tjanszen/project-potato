import { pgTable, uuid, text, date, boolean, timestamp, primaryKey, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
// Users table
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    timezone: text('timezone').notNull(), // e.g., "America/New_York"
    createdAt: timestamp('created_at').notNull().defaultNow(),
});
// Day marks table (deduped current state)
export const dayMarks = pgTable('day_marks', {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    value: boolean('value').notNull(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    pk: primaryKey({ columns: [table.userId, table.date] }),
    dateCheck: check('date_check', sql `date >= DATE '2025-01-01'`),
    valueCheck: check('value_check', sql `value = TRUE`), // v1 only stores TRUE
}));
// Click events table (append-only event log)
export const clickEvents = pgTable('click_events', {
    clickId: uuid('click_id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    value: boolean('value').notNull(),
    userLocalDate: date('user_local_date').notNull(),
    userTimezone: text('user_timezone').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
    dateCheck: check('date_check', sql `date >= DATE '2025-01-01'`),
    valueCheck: check('value_check', sql `value = TRUE`), // v1 only stores TRUE
}));
// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
    id: true,
    createdAt: true,
}).extend({
    password: z.string().min(1, 'Password is required'),
}).omit({
    passwordHash: true,
});
export const insertDayMarkSchema = createInsertSchema(dayMarks).omit({
    updatedAt: true,
});
export const insertClickEventSchema = createInsertSchema(clickEvents).omit({
    clickId: true,
    createdAt: true,
});
