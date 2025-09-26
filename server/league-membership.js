"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProofTests = exports.countActiveMembers = exports.getUserMembership = exports.leaveLeague = exports.joinLeague = void 0;

const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");
const { users } = require("../shared/schema.js");
const { eq, and } = require("drizzle-orm");
const { pgTable, uuid, integer, boolean, timestamp, index } = require("drizzle-orm/pg-core");
const { sql } = require("drizzle-orm");

console.log("LeagueMembershipService initialized");

// Define league_memberships table (JavaScript version of the table from schema.ts)
const leagueMemberships = pgTable('league_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  leagueId: integer('league_id').notNull(), // References CSV league_id
  isActive: boolean('is_active').notNull().default(true),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
  leftAt: timestamp('left_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Indexes for performance
  userIdx: index('membership_user_idx').on(table.userId),
  leagueIdx: index('membership_league_idx').on(table.leagueId),
  leagueActiveIdx: index('membership_league_active_idx').on(table.leagueId, table.isActive),
  // Partial unique constraint: one active membership per user per league
  uniqueActiveMembership: sql`UNIQUE (${table.userId}, ${table.leagueId}) WHERE ${table.isActive} = true`,
}));

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

/**
 * Join a league - Insert a new membership or return existing active membership
 * @param {string} userId - UUID of the user
 * @param {number} leagueId - ID of the league to join
 * @returns {Promise<Object>} The membership record
 */
async function joinLeague(userId, leagueId) {
  try {
    // Check for existing active membership
    const existingMembership = await db
      .select()
      .from(leagueMemberships)
      .where(
        and(
          eq(leagueMemberships.userId, userId),
          eq(leagueMemberships.leagueId, leagueId),
          eq(leagueMemberships.isActive, true)
        )
      )
      .limit(1);

    // If active membership exists, return it
    if (existingMembership.length > 0) {
      console.log(`User ${userId} already has active membership in league ${leagueId}`);
      return existingMembership[0];
    }

    // Insert new membership
    const newMembership = await db
      .insert(leagueMemberships)
      .values({
        userId,
        leagueId,
        isActive: true,
      })
      .returning();

    console.log(`User ${userId} joined league ${leagueId}`);
    return newMembership[0];
  } catch (error) {
    console.error(`Error joining league: ${error.message}`);
    throw error;
  }
}
exports.joinLeague = joinLeague;

/**
 * Leave a league - Set membership to inactive and record leave time
 * @param {string} userId - UUID of the user
 * @param {number} leagueId - ID of the league to leave
 * @returns {Promise<Object|null>} The updated membership record or null if not found
 */
async function leaveLeague(userId, leagueId) {
  try {
    const updatedMembership = await db
      .update(leagueMemberships)
      .set({
        isActive: false,
        leftAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leagueMemberships.userId, userId),
          eq(leagueMemberships.leagueId, leagueId),
          eq(leagueMemberships.isActive, true)
        )
      )
      .returning();

    if (updatedMembership.length === 0) {
      console.log(`No active membership found for user ${userId} in league ${leagueId}`);
      return null;
    }

    console.log(`User ${userId} left league ${leagueId}`);
    return updatedMembership[0];
  } catch (error) {
    console.error(`Error leaving league: ${error.message}`);
    throw error;
  }
}
exports.leaveLeague = leaveLeague;

/**
 * Get user's membership status for a specific league
 * @param {string} userId - UUID of the user
 * @param {number} leagueId - ID of the league
 * @returns {Promise<Object|null>} Membership data or null if not found
 */
async function getUserMembership(userId, leagueId) {
  try {
    // Get the most recent membership record for this user/league combination
    const membership = await db
      .select({
        joinedAt: leagueMemberships.joinedAt,
        leftAt: leagueMemberships.leftAt,
        isActive: leagueMemberships.isActive,
      })
      .from(leagueMemberships)
      .where(
        and(
          eq(leagueMemberships.userId, userId),
          eq(leagueMemberships.leagueId, leagueId)
        )
      )
      .orderBy(leagueMemberships.createdAt)
      .limit(1);

    if (membership.length === 0) {
      return null;
    }

    return membership[0];
  } catch (error) {
    console.error(`Error getting user membership: ${error.message}`);
    throw error;
  }
}
exports.getUserMembership = getUserMembership;

/**
 * Count active members in a league
 * @param {number} leagueId - ID of the league
 * @returns {Promise<number>} Number of active members
 */
async function countActiveMembers(leagueId) {
  try {
    const result = await db
      .select({ count: leagueMemberships.id })
      .from(leagueMemberships)
      .where(
        and(
          eq(leagueMemberships.leagueId, leagueId),
          eq(leagueMemberships.isActive, true)
        )
      );

    // Count the returned rows since Drizzle doesn't have a direct count method
    const count = result.length;
    console.log(`League ${leagueId} has ${count} active members`);
    return count;
  } catch (error) {
    console.error(`Error counting active members: ${error.message}`);
    throw error;
  }
}
exports.countActiveMembers = countActiveMembers;

// Test functions for proof requirements
async function runProofTests() {
  console.log("=== Running League Membership Proof Tests ===");
  
  try {
    // Get a test user from the database
    const testUser = await db.select().from(users).limit(1);
    if (testUser.length === 0) {
      console.log("No test user found - skipping proof tests");
      return;
    }
    
    const testUserId = testUser[0].id;
    const testLeagueId = 1;
    
    console.log(`Using test user: ${testUserId}, league: ${testLeagueId}`);
    
    // Test 1: Insert test - joinLeague
    console.log("--- Test 1: Insert Test ---");
    const joinResult = await joinLeague(testUserId, testLeagueId);
    console.log("Join result:", joinResult);
    
    // Verify new row appears in database
    const insertedRow = await db
      .select()
      .from(leagueMemberships)
      .where(eq(leagueMemberships.id, joinResult.id));
    console.log("Inserted row verification:", insertedRow[0]);
    
    // Test 2: Update test - leaveLeague  
    console.log("--- Test 2: Update Test ---");
    const leaveResult = await leaveLeague(testUserId, testLeagueId);
    console.log("Leave result:", leaveResult);
    
    // Verify row updated with is_active=false and left_at populated
    const updatedRow = await db
      .select()
      .from(leagueMemberships)
      .where(eq(leagueMemberships.id, leaveResult.id));
    console.log("Updated row verification:", updatedRow[0]);
    console.log("is_active should be false:", updatedRow[0].isActive === false);
    console.log("left_at should be populated:", updatedRow[0].leftAt !== null);
    
    // Test 3: Query test - getUserMembership
    console.log("--- Test 3: Query Test ---");
    const membershipResult = await getUserMembership(testUserId, testLeagueId);
    console.log("Membership result:", membershipResult);
    
    // Test 4: Count test - countActiveMembers
    console.log("--- Test 4: Count Test ---");
    const activeCount = await countActiveMembers(testLeagueId);
    console.log("Active members count:", activeCount);
    
    // Verify count matches actual active rows
    const actualActiveRows = await db
      .select()
      .from(leagueMemberships)
      .where(
        and(
          eq(leagueMemberships.leagueId, testLeagueId),
          eq(leagueMemberships.isActive, true)
        )
      );
    console.log("Actual active rows count:", actualActiveRows.length);
    console.log("Count test matches:", activeCount === actualActiveRows.length);
    
    console.log("=== All Proof Tests Completed ===");
    
  } catch (error) {
    console.error("Proof test error:", error);
    throw error;
  }
}
exports.runProofTests = runProofTests;