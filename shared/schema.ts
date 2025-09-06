import { pgTable, uuid, text, date, boolean, timestamp, primaryKey, check, customType, integer, unique, index } from 'drizzle-orm/pg-core';
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Custom daterange type for PostgreSQL
const daterange = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'daterange';
  },
  fromDriver(value: string): string {
    return value;
  },
  toDriver(value: string): string {
    return value;
  }
});

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
  dateCheck: check('date_check', sql`date >= DATE '2025-01-01'`),
  valueCheck: check('value_check', sql`value = TRUE`), // v1 only stores TRUE
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
  dateCheck: check('date_check', sql`date >= DATE '2025-01-01'`),
  valueCheck: check('value_check', sql`value = TRUE`), // v1 only stores TRUE
}));

// Runs table (V2 feature - tracks consecutive day runs)
export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  span: daterange('span').notNull(),
  dayCount: integer('day_count').notNull(),
  active: boolean('active').notNull().default(false),
  lastExtendedAt: timestamp('last_extended_at').defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // Generated helper columns (will be added via raw SQL)
  startDate: date('start_date'),
  endDate: date('end_date'),
}, (table) => ({
  // Ensure non-overlapping spans per user using PostgreSQL EXCLUDE constraint
  nonOverlappingSpans: sql`EXCLUDE USING gist (${table.userId} WITH =, ${table.span} WITH &&) DEFERRABLE INITIALLY IMMEDIATE`,
  // Unique active run per user (partial unique index on active = true)
  uniqueActiveRun: sql`UNIQUE (${table.userId}) WHERE ${table.active} = true`,
  // Day count must match span length
  dayCountCheck: check('day_count_check', sql`${table.dayCount} = upper(${table.span}) - lower(${table.span})`),
  // Span must be valid
  spanCheck: check('span_check', sql`upper(${table.span}) >= lower(${table.span})`),
  // Indexes for performance
  userEndDateIdx: index('runs_user_end_date_idx').on(table.userId, table.endDate),
  userActiveIdx: index('runs_user_active_idx').on(table.userId, table.active),
}));

// SQLite-compatible runs table (fallback for environments without PostgreSQL)
export const runsSqlite = sqliteTable('runs', {
  id: sqliteText('id').primaryKey().$default(() => crypto.randomUUID()),
  userId: sqliteText('user_id').notNull(),
  startDate: sqliteText('start_date').notNull(), // YYYY-MM-DD format
  endDate: sqliteText('end_date').notNull(),     // YYYY-MM-DD format (inclusive)
  dayCount: sqliteInteger('day_count').notNull(),
  active: sqliteInteger('active').notNull().default(0), // 0=false, 1=true
  lastExtendedAt: sqliteInteger('last_extended_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  createdAt: sqliteInteger('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: sqliteInteger('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Database-agnostic validation functions
export const runsValidation = {
  // Check for overlapping spans (works on both PostgreSQL and SQLite)
  checkOverlaps: (dialect: 'postgres' | 'sqlite') => {
    if (dialect === 'postgres') {
      return sql`
        SELECT COUNT(*) as violations
        FROM runs r1
        JOIN runs r2 ON r1.user_id = r2.user_id AND r1.id < r2.id
        WHERE r1.span && r2.span
      `;
    } else {
      return sql`
        SELECT COUNT(*) as violations
        FROM runs r1
        JOIN runs r2 ON r1.user_id = r2.user_id AND r1.id < r2.id
        WHERE NOT (r1.end_date < r2.start_date OR r2.end_date < r1.start_date)
      `;
    }
  },

  // Check for multiple active runs per user
  checkMultipleActive: () => sql`
    SELECT COUNT(*) as violations
    FROM (
      SELECT user_id, COUNT(*) as active_count
      FROM runs
      WHERE active = 1
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) multi_active
  `,

  // Check day count accuracy
  checkDayCount: (dialect: 'postgres' | 'sqlite') => {
    if (dialect === 'postgres') {
      return sql`
        SELECT COUNT(*) as violations
        FROM runs
        WHERE day_count != (upper(span) - lower(span))
      `;
    } else {
      return sql`
        SELECT COUNT(*) as violations
        FROM runs
        WHERE day_count != (julianday(end_date) - julianday(start_date) + 1)
      `;
    }
  }
};

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

export const insertRunSchema = createInsertSchema(runs).omit({
  id: true,
  lastExtendedAt: true,
  createdAt: true,
  updatedAt: true,
  startDate: true,
  endDate: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type NewUser = z.infer<typeof insertUserSchema>;
export type DayMark = typeof dayMarks.$inferSelect;
export type NewDayMark = z.infer<typeof insertDayMarkSchema>;
export type ClickEvent = typeof clickEvents.$inferSelect;
export type NewClickEvent = z.infer<typeof insertClickEventSchema>;
export type Run = typeof runs.$inferSelect;
export type NewRun = z.infer<typeof insertRunSchema>;