import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, dayMarks, clickEvents, runs, type User, type NewUser, type DayMark, type NewDayMark, type ClickEvent, type NewClickEvent, type Run, type NewRun } from '../shared/schema.js';
import { eq, and, sql, or, gte, lte, lt, gt, desc, asc } from 'drizzle-orm';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

// Storage interface for all database operations
export interface IStorage {
  // User operations
  createUser(user: NewUser & { passwordHash: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  
  // Day marks operations
  getDayMarksForMonth(userId: string, month: string): Promise<DayMark[]>;
  markDay(dayMark: NewDayMark): Promise<DayMark>;
  getDayMark(userId: string, date: string): Promise<DayMark | null>;
  
  // Event logging
  logClickEvent(event: NewClickEvent): Promise<ClickEvent>;
  
  // Runs operations (V2)
  getRuns(userId: string): Promise<Run[]>;
  getActiveRun(userId: string): Promise<Run | null>;
  getRunsForDateRange(userId: string, startDate: string, endDate: string): Promise<Run[]>;
  performRunExtend(userId: string, date: string): Promise<RunOperationResult>;
  performRunMerge(userId: string, date: string): Promise<RunOperationResult>;
  performRunSplit(userId: string, date: string): Promise<RunOperationResult>;
  validateRunInvariants(userId: string): Promise<RunValidationResult>;
  
  // Phase 6B-2: Transaction boundary operations
  calculateTransactionBoundary(userId: string, date: string, operationType: 'extend' | 'merge' | 'split'): Promise<TransactionBoundary>;
  executeWithTransactionBoundary<T>(boundary: TransactionBoundary, operation: () => Promise<T>): Promise<{ result: T; metrics: TransactionMetrics }>;
  validateTransactionScope(userId: string, date: string): Promise<TransactionScope>;
  validateIsolationLevel(): Promise<string>;
}

// Result types for run operations
export interface RunOperationResult {
  success: boolean;
  message: string;
  affectedRuns: Run[];
  wasNoOp: boolean;
  transactionMetrics?: TransactionMetrics;
}

export interface RunValidationResult {
  valid: boolean;
  violations: {
    overlappingRuns: number;
    multipleActiveRuns: number;
    dayCountMismatches: number;
  };
}

// Phase 6B-2: Transaction boundary types
export interface TransactionMetrics {
  durationMs: number;
  rowsLocked: number;
  isolationLevel: string;
  operationType: string;
}

export interface TransactionBoundary {
  userId: string;
  dateRange: { start: string; end: string };
  operationType: 'extend' | 'merge' | 'split';
  expectedRows: number;
}

export interface TransactionScope {
  lockQuery: string;
  lockParams: any[];
  expectedRows: number;
}

// PostgreSQL implementation
export class PostgresStorage implements IStorage {
  async createUser(user: NewUser & { passwordHash: string }): Promise<User> {
    const [newUser] = await db.insert(users).values({
      email: user.email,
      passwordHash: user.passwordHash,
      timezone: user.timezone,
    }).returning();
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async getDayMarksForMonth(userId: string, month: string): Promise<DayMark[]> {
    // month format: "2025-06"
    const startDate = `${month}-01`;
    const endDate = `${month}-31`; // Simplified - covers all possible month lengths
    
    const marks = await db.select()
      .from(dayMarks)
      .where(
        and(
          eq(dayMarks.userId, userId),
          eq(dayMarks.value, true) // Only get true values in v1
        )
      );
    
    // Filter by month on the application side for simplicity
    return marks.filter(mark => mark.date.startsWith(month));
  }

  async getDayMark(userId: string, date: string): Promise<DayMark | null> {
    const [mark] = await db.select()
      .from(dayMarks)
      .where(
        and(
          eq(dayMarks.userId, userId),
          eq(dayMarks.date, date)
        )
      );
    return mark || null;
  }

  async markDay(dayMark: NewDayMark): Promise<DayMark> {
    // Use ON CONFLICT to handle idempotency
    const [mark] = await db.insert(dayMarks)
      .values(dayMark)
      .onConflictDoUpdate({
        target: [dayMarks.userId, dayMarks.date],
        set: { 
          value: dayMark.value, 
          updatedAt: new Date() 
        }
      })
      .returning();
    return mark;
  }

  async logClickEvent(event: NewClickEvent): Promise<ClickEvent> {
    const [clickEvent] = await db.insert(clickEvents).values(event).returning();
    return clickEvent;
  }

  // Run operations (V2)
  async getRuns(userId: string): Promise<Run[]> {
    return await db.select()
      .from(runs)
      .where(eq(runs.userId, userId))
      .orderBy(asc(runs.startDate));
  }

  async getActiveRun(userId: string): Promise<Run | null> {
    const [activeRun] = await db.select()
      .from(runs)
      .where(and(eq(runs.userId, userId), eq(runs.active, true)));
    return activeRun || null;
  }

  async getRunsForDateRange(userId: string, startDate: string, endDate: string): Promise<Run[]> {
    return await db.select()
      .from(runs)
      .where(and(
        eq(runs.userId, userId),
        // Use PostgreSQL daterange overlap operator
        sql`${runs.span} && ${sql.raw(`'[${startDate},${endDate}]'::daterange`)}` 
      ))
      .orderBy(asc(runs.startDate));
  }

  async performRunExtend(userId: string, date: string): Promise<RunOperationResult> {
    // Find runs that could be extended by this date (adjacent runs)
    const adjacentRuns = await db.select()
      .from(runs) 
      .where(and(
        eq(runs.userId, userId),
        or(
          // Date is one day after end of run
          sql`upper(${runs.span}) = ${date}::date`,
          // Date is one day before start of run  
          sql`lower(${runs.span}) = ${date}::date + interval '1 day'`,
          // Date is within existing run (no-op case)
          sql`${runs.span} @> ${date}::date`
        )
      ));

    if (adjacentRuns.length === 0) {
      // Create new run for isolated date
      const newRun = await this.createSingleDateRun(userId, date);
      return {
        success: true,
        message: `Created new run for isolated date ${date}`,
        affectedRuns: [newRun],
        wasNoOp: false
      };
    }

    // Check if date is already within an existing run (idempotent no-op)
    const existingRunsContainingDate = await db.select()
      .from(runs)
      .where(and(
        eq(runs.userId, userId),
        sql`${runs.span} @> ${date}::date`
      ));

    if (existingRunsContainingDate.length > 0) {
      return {
        success: true,
        message: `Date ${date} already exists in run, no operation needed`,
        affectedRuns: existingRunsContainingDate,
        wasNoOp: true
      };
    }

    // Extend the run(s)
    const updatedRuns: Run[] = [];
    for (const run of adjacentRuns) {
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

  async performRunMerge(userId: string, date: string): Promise<RunOperationResult> {
    // Find runs that could be merged by filling gap at this date
    const beforeRun = await db.select()
      .from(runs)
      .where(and(
        eq(runs.userId, userId),
        sql`upper(${runs.span}) = ${date}::date - interval '1 day'`
      ));

    const afterRun = await db.select()
      .from(runs)  
      .where(and(
        eq(runs.userId, userId),
        sql`lower(${runs.span}) = ${date}::date + interval '1 day'`
      ));

    if (beforeRun.length === 0 || afterRun.length === 0) {
      // Can't merge - treat as extend instead
      return await this.performRunExtend(userId, date);
    }

    const before = beforeRun[0];
    const after = afterRun[0];

    // Merge the runs by updating the first run to include the second run's span
    const mergedRun = await db.update(runs)
      .set({
        span: sql`${runs.span} + ${after.span}`,
        dayCount: sql`${before.dayCount} + ${after.dayCount} + 1`, // +1 for the gap date
        active: before.active || after.active, // Preserve active status
        updatedAt: new Date()
      })
      .where(eq(runs.id, before.id))
      .returning();

    // Delete the second run
    await db.delete(runs).where(eq(runs.id, after.id));

    return {
      success: true,
      message: `Merged runs by filling gap at ${date}`,
      affectedRuns: mergedRun,
      wasNoOp: false
    };
  }

  async performRunSplit(userId: string, date: string): Promise<RunOperationResult> {
    // Find run containing this date
    const [containingRun] = await db.select()
      .from(runs)
      .where(and(
        eq(runs.userId, userId),
        sql`${runs.span} @> ${date}::date`
      ));

    if (!containingRun) {
      return {
        success: true,
        message: `Date ${date} not found in any run, no operation needed`,
        affectedRuns: [],
        wasNoOp: true
      };
    }

    // Check if removing this date would split the run
    const runStart = sql`lower(${runs.span})`;
    const runEnd = sql`upper(${runs.span})`;
    
    if (sql`${runStart} = ${date}::date`) {
      // Remove from start of run
      if (containingRun.dayCount === 1) {
        // Delete single-day run
        await db.delete(runs).where(eq(runs.id, containingRun.id));
        return {
          success: true,
          message: `Deleted single-day run at ${date}`,
          affectedRuns: [],
          wasNoOp: false
        };
      } else {
        // Shrink run from start
        const [updatedRun] = await db.update(runs)
          .set({
            span: sql`daterange((${date}::date + interval '1 day')::date, upper(${runs.span}), '[)')`,
            dayCount: containingRun.dayCount - 1,
            updatedAt: new Date()
          })
          .where(eq(runs.id, containingRun.id))
          .returning();
        
        return {
          success: true,
          message: `Removed ${date} from start of run`,
          affectedRuns: [updatedRun],
          wasNoOp: false
        };
      }
    } else if (sql`${runEnd} = ${date}::date + interval '1 day'`) {
      // Remove from end of run
      const [updatedRun] = await db.update(runs)
        .set({
          span: sql`daterange(lower(${runs.span}), ${date}::date, '[)')`,
          dayCount: containingRun.dayCount - 1,
          active: false, // End date removed, so no longer active
          updatedAt: new Date()
        })
        .where(eq(runs.id, containingRun.id))
        .returning();
      
      return {
        success: true,
        message: `Removed ${date} from end of run`,
        affectedRuns: [updatedRun],
        wasNoOp: false
      };
    } else {
      // Split run in middle
      const originalRun = containingRun;
      
      // Create first part of split run
      const [firstRun] = await db.update(runs)
        .set({
          span: sql`daterange(lower(${runs.span}), ${date}::date, '[)')`,
          dayCount: sql`${date}::date - lower(${runs.span})`,
          active: false, // First part is no longer active
          updatedAt: new Date()
        })
        .where(eq(runs.id, originalRun.id))
        .returning();

      // Create second part of split run  
      const [secondRun] = await db.insert(runs)
        .values({
          userId: userId,
          span: sql`daterange((${date}::date + interval '1 day')::date, upper(${runs.span}), '[)')`,
          dayCount: sql`upper(${runs.span}) - (${date}::date + interval '1 day')`,
          active: originalRun.active, // Second part preserves active status
        })
        .returning();

      return {
        success: true,
        message: `Split run by removing ${date} from middle`,
        affectedRuns: [firstRun, secondRun],
        wasNoOp: false
      };
    }
  }

  async validateRunInvariants(userId: string): Promise<RunValidationResult> {
    // Check for overlapping runs
    const overlappingResult = await db.execute(sql`
      SELECT COUNT(*) as violations
      FROM runs r1
      JOIN runs r2 ON r1.user_id = r2.user_id AND r1.id < r2.id
      WHERE r1.user_id = ${userId} AND r1.span && r2.span
    `);

    // Check for multiple active runs
    const multipleActiveResult = await db.execute(sql`
      SELECT COUNT(*) - 1 as violations
      FROM runs
      WHERE user_id = ${userId} AND active = true
    `);

    // Check day count accuracy
    const dayCountResult = await db.execute(sql`
      SELECT COUNT(*) as violations
      FROM runs
      WHERE user_id = ${userId} AND day_count != (upper(span) - lower(span))
    `);

    const violations = {
      overlappingRuns: Number(overlappingResult.rows[0]?.violations) || 0,
      multipleActiveRuns: Math.max(0, Number(multipleActiveResult.rows[0]?.violations) || 0),
      dayCountMismatches: Number(dayCountResult.rows[0]?.violations) || 0,
    };

    return {
      valid: violations.overlappingRuns === 0 && 
             violations.multipleActiveRuns === 0 && 
             violations.dayCountMismatches === 0,
      violations
    };
  }

  // Helper method to create a single-date run
  private async createSingleDateRun(userId: string, date: string): Promise<Run> {
    const [newRun] = await db.insert(runs)
      .values({
        userId: userId,
        span: sql`daterange(${date}::date, (${date}::date + interval '1 day')::date, '[)')`,
        dayCount: 1,
        active: true,
      })
      .returning();
    return newRun;
  }

  // Helper method to extend a run with a new date
  private async extendRunWithDate(runId: string, date: string): Promise<Run> {
    const [updatedRun] = await db.update(runs)
      .set({
        span: sql`${runs.span} + daterange(${date}::date, (${date}::date + interval '1 day')::date, '[)')`,
        dayCount: sql`${runs.dayCount} + 1`,
        active: true,
        lastExtendedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(runs.id, runId))
      .returning();
    return updatedRun;
  }

  // Phase 6B-2: Transaction boundary operations
  async calculateTransactionBoundary(userId: string, date: string, operationType: 'extend' | 'merge' | 'split'): Promise<TransactionBoundary> {
    // Calculate the date range that needs to be locked for this operation
    const operationDate = new Date(date);
    const dayBefore = new Date(operationDate);
    dayBefore.setDate(operationDate.getDate() - 1);
    const dayAfter = new Date(operationDate);
    dayAfter.setDate(operationDate.getDate() + 1);

    const startDate = dayBefore.toISOString().split('T')[0];
    const endDate = dayAfter.toISOString().split('T')[0];

    // Estimate expected rows based on operation type
    let expectedRows: number;
    switch (operationType) {
      case 'extend':
        expectedRows = 2; // Current run + potential adjacent run
        break;
      case 'merge':
        expectedRows = 3; // Two runs being merged + potential active run
        break;
      case 'split':
        expectedRows = 2; // Run being split + potential new run
        break;
      default:
        expectedRows = 3;
    }

    return {
      userId,
      dateRange: { start: startDate, end: endDate },
      operationType,
      expectedRows
    };
  }

  async executeWithTransactionBoundary<T>(boundary: TransactionBoundary, operation: () => Promise<T>): Promise<{ result: T; metrics: TransactionMetrics }> {
    const startTime = performance.now();
    
    try {
      // Start transaction with READ COMMITTED isolation level
      await db.execute(sql`BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED`);
      
      // Acquire locks on affected runs only
      const lockQuery = sql`
        SELECT id, span, day_count, active
        FROM runs 
        WHERE user_id = ${boundary.userId}
        AND (
          active = true 
          OR lower(span) <= ${boundary.dateRange.end}::date
          AND upper(span) >= ${boundary.dateRange.start}::date
        )
        FOR UPDATE
      `;
      
      const lockedRows = await db.execute(lockQuery);
      const actualRowsLocked = lockedRows.rowCount || 0;
      
      // Execute the operation
      const result = await operation();
      
      // Commit transaction
      await db.execute(sql`COMMIT`);
      
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      const metrics: TransactionMetrics = {
        durationMs: Math.round(durationMs * 100) / 100, // Round to 2 decimal places
        rowsLocked: actualRowsLocked,
        isolationLevel: 'READ COMMITTED',
        operationType: boundary.operationType
      };
      
      return { result, metrics };
      
    } catch (error) {
      // Rollback on error
      await db.execute(sql`ROLLBACK`);
      throw error;
    }
  }

  async validateTransactionScope(userId: string, date: string): Promise<TransactionScope> {
    // Create the locking query that should be used for transaction boundaries
    const lockQuery = `
      SELECT id, span, day_count, active
      FROM runs 
      WHERE user_id = $1
      AND (
        active = true 
        OR lower(span) <= ($2::date + interval '1 day')::date
        AND upper(span) >= ($2::date - interval '1 day')::date
      )
      FOR UPDATE
    `;
    
    // Calculate expected rows by running the query without FOR UPDATE
    const countQuery = sql`
      SELECT COUNT(*) as expected_rows
      FROM runs 
      WHERE user_id = ${userId}
      AND (
        active = true 
        OR lower(span) <= (${date}::date + interval '1 day')::date
        AND upper(span) >= (${date}::date - interval '1 day')::date
      )
    `;
    
    const result = await db.execute(countQuery);
    const expectedRows = Number(result.rows[0]?.expected_rows) || 0;
    
    return {
      lockQuery,
      lockParams: [userId, date],
      expectedRows
    };
  }

  async validateIsolationLevel(): Promise<string> {
    const result = await db.execute(sql`SHOW transaction_isolation`);
    return result.rows[0]?.transaction_isolation || 'unknown';
  }
}

// Export singleton instance
export const storage = new PostgresStorage();