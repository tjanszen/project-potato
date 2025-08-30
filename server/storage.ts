import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, dayMarks, clickEvents, type User, type NewUser, type DayMark, type NewDayMark, type ClickEvent, type NewClickEvent } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

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
}

// Export singleton instance
export const storage = new PostgresStorage();