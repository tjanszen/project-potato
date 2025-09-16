import { config } from 'dotenv';
import path from 'path';

// Load environment variables from server/.env (always from project root)
config({ path: path.resolve(process.cwd(), 'server/.env') });

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { featureFlagService } from './feature-flags.js';
import { storage } from './storage.js';
import { insertUserSchema } from '../shared/schema.js';



// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}


const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors({
  origin: "https://upgraded-broccoli-rwrgrgqr6g2xxg9-5173.app.github.dev",
  credentials: true,
}));
app.use(express.json());
// Trust proxy (needed for Codespaces / GitHub forwarded ports so cookies work)
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none',
  domain: process.env.NODE_ENV === 'production' ? undefined : '.app.github.dev',
  maxAge: 24 * 60 * 60 * 1000
}

}));

// Debug log: confirm cookie/session config at runtime
console.log("SESSION COOKIE CONFIG:", {
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none',
  domain: process.env.NODE_ENV === 'production' ? undefined : '.app.github.dev'
});

// Root endpoint (always available)
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Health check endpoint (always available)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Feature flag endpoints
app.get('/api/feature-flags/:flagName', (req, res) => {
  const { flagName } = req.params;
  const flag = featureFlagService.getFlag(flagName);
  
  if (!flag) {
    return res.status(404).json({ error: 'Feature flag not found' });
  }
  
  res.json(flag);
});

app.get('/api/feature-flags', (req, res) => {
  const flags = featureFlagService.getAllFlags();
  res.json(flags);
});

// Admin endpoint to toggle feature flags (for testing Phase 1A)
app.post('/api/admin/toggle-flag/:flagName', (req, res) => {
  const { flagName } = req.params;
  const newState = featureFlagService.toggleFlag(flagName);
  res.json({ 
    flag: flagName, 
    enabled: newState,
    message: `Feature flag ${flagName} is now ${newState ? 'enabled' : 'disabled'}`
  });
});

// GET version of toggle for easier browser testing
app.get('/api/admin/toggle-flag/:flagName', (req, res) => {
  const { flagName } = req.params;
  const newState = featureFlagService.toggleFlag(flagName);
  res.json({ 
    flag: flagName, 
    enabled: newState,
    message: `Feature flag ${flagName} is now ${newState ? 'enabled' : 'disabled'}`
  });
});

// Admin endpoint for Phase C: Backfill runs for existing day_marks
app.post('/api/admin/backfill-runs', async (req, res) => {
  try {
    // Check if runs v2 feature flag is enabled
    if (!featureFlagService.isEnabled('ff.potato.runs_v2')) {
      return res.status(403).json({ 
        error: 'Feature not available',
        flag: 'ff.potato.runs_v2',
        enabled: false,
        message: 'Runs V2 feature flag must be enabled to run backfill'
      });
    }
    
    const { dryRun = false, batchSize = 10 } = req.body;
    
    console.log(`[ADMIN] Backfill runs requested: dryRun=${dryRun}, batchSize=${batchSize}`);
    
    // Execute backfill operation (using type assertion since runtime uses JS implementation)
    const result = await (storage as any).backfillAllUserRuns({
      dryRun,
      batchSize,
      skipBackup: false
    });
    
    res.json({
      success: true,
      operation: 'backfill-runs',
      result: result,
      message: dryRun ? 'Dry run completed - no changes made' : `Backfill completed: ${result.completedUsers}/${result.totalUsers} users processed`
    });
    
  } catch (error) {
    console.error('[ADMIN] Backfill runs failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Backfill operation failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET version of backfill for easier browser testing  
app.get('/api/admin/backfill-runs', async (req, res) => {
  try {
    // Check if runs v2 feature flag is enabled
    if (!featureFlagService.isEnabled('ff.potato.runs_v2')) {
      return res.status(403).json({ 
        error: 'Feature not available',
        flag: 'ff.potato.runs_v2',
        enabled: false,
        message: 'Runs V2 feature flag must be enabled to run backfill'
      });
    }
    
    const { dryRun = 'true', batchSize = '10' } = req.query;
    const isDryRun = dryRun === 'true';
    const batchSizeNum = parseInt(batchSize as string) || 10;
    
    console.log(`[ADMIN] Backfill runs requested (GET): dryRun=${isDryRun}, batchSize=${batchSizeNum}`);
    
    // Execute backfill operation (using type assertion since runtime uses JS implementation)
    const result = await (storage as any).backfillAllUserRuns({
      dryRun: isDryRun,
      batchSize: batchSizeNum,
      skipBackup: false
    });
    
    res.json({
      success: true,
      operation: 'backfill-runs',
      result: result,
      message: isDryRun ? 'Dry run completed - no changes made' : `Backfill completed: ${result.completedUsers}/${result.totalUsers} users processed`
    });
    
  } catch (error) {
    console.error('[ADMIN] Backfill runs failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Backfill operation failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Feature flag gating middleware
const requireFeatureFlag = (flagName: string) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!featureFlagService.isEnabled(flagName)) {
      return res.status(403).json({ 
        error: 'Feature not available',
        flag: flagName,
        enabled: false
      });
    }
    next();
  };
};

// Authentication middleware
const requireAuthentication = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  next();
};

// All app functionality gated behind main feature flag
app.use('/api/auth', requireFeatureFlag('ff.potato.no_drink_v1'));
app.use('/api/calendar', requireFeatureFlag('ff.potato.no_drink_v1'));
app.use('/api/days', requireFeatureFlag('ff.potato.no_drink_v1'));
app.use('/api/me', requireFeatureFlag('ff.potato.no_drink_v1'));

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    // Validate request body
    const validationResult = insertUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      });
    }

    const { email, passwordHash, timezone } = validationResult.data;
    const password = req.body.password; // Get the plain password from the original request

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user 
    const newUser = await storage.createUser({
      email,
      timezone,
      passwordHash: hashedPassword
    });

    // Regenerate session and log the new user in immediately
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error (signup):', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Store user ID in session
      req.session.userId = newUser.id;

      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('Session save error (signup):', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        console.log("Signup session created:", req.session.id);

        // Return user without password hash
        const { passwordHash: _, ...userResponse } = newUser;
        res.status(201).json({
          message: 'User created successfully',
          user: userResponse
        });
      });
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Regenerate session ID to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      // Store user ID in session
      req.session.userId = user.id;
      
      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        // Return user data without password hash
        const { passwordHash: _, ...userResponse } = user;
        res.json({ 
          message: 'Login successful',
          user: userResponse 
        });
      });
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User profile endpoint (Phase 1D with debug logging)
app.get('/api/me', requireAuthentication, async (req, res) => {
  console.log("🍪 Headers:", req.headers.cookie);
  console.log("🆔 SessionID:", req.sessionID);
  console.log("📦 Session object:", req.session);

  try {
    const user = await storage.getUserById(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data without password hash
    const { passwordHash: _, ...userProfile } = user;
    console.log("✅ Authenticated user:", user.id);

    res.json({ user: userProfile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Logout endpoint (Phase 4A) - Properly destroy session
app.post('/api/auth/logout', requireAuthentication, async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calendar endpoint (Phase 2A)
app.get('/api/calendar', requireAuthentication, async (req, res) => {
  try {
    const { month } = req.query;
    
    // Validate month parameter format (YYYY-MM)
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ 
        error: 'Month parameter is required',
        format: 'YYYY-MM (e.g., 2025-06)'
      });
    }
    
    // Validate month format with regex
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({ 
        error: 'Invalid month format',
        format: 'YYYY-MM (e.g., 2025-06)',
        received: month
      });
    }
    
    // Additional validation: ensure it's a valid month (01-12)
    const [year, monthNum] = month.split('-');
    const monthNumber = parseInt(monthNum, 10);
    if (monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({ 
        error: 'Invalid month number',
        message: 'Month must be between 01 and 12',
        received: month
      });
    }
    
    // Fetch day marks for the user and month
    const dayMarks = await storage.getDayMarksForMonth(req.session.userId!, month);
    
    // Format response data
    const markedDates = dayMarks.map(mark => mark.localDate);
    
    res.json({
      month: month,
      markedDates: markedDates,
      count: markedDates.length
    });
    
  } catch (error) {
    console.error('Calendar fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/days/:date/no-drink', (req, res) => {
  res.json({ message: 'Day marking endpoint - Phase 2' });
});

// V2 API endpoints (Phase 6E-Lite) - gated behind ff.potato.runs_v2
app.use('/api/v2', requireFeatureFlag('ff.potato.runs_v2'));
app.use('/health/runs', requireFeatureFlag('ff.potato.runs_v2'));

// GET /api/v2/runs - User run history with pagination
app.get('/api/v2/runs', requireAuthentication, async (req, res) => {
  try {
    const { limit = '20', offset = '0', from_date, to_date } = req.query;
    
    // Parse and validate pagination parameters
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = parseInt(offset as string) || 0;
    
    // Get runs from storage
    const runs = await storage.getRunsForUser(req.session.userId!, {
      limit: limitNum,
      offset: offsetNum,
      fromDate: from_date as string,
      toDate: to_date as string
    });
    
    // Get total count for pagination
    const totalCount = await storage.getRunsCountForUser(req.session.userId!);
    
    res.json({
      runs: runs,
      total_count: totalCount,
      has_more: offsetNum + limitNum < totalCount,
      limit: limitNum,
      offset: offsetNum
    });
    
  } catch (error) {
    console.error('V2 runs fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v2/totals - User statistics summary
app.get('/api/v2/totals', requireAuthentication, async (req, res) => {
  try {
    const totals = await storage.getTotalsForUser(req.session.userId!);
    
    res.json({
      total_days: totals.totalDays,
      current_run_days: totals.currentRunDays,
      longest_run_days: totals.longestRunDays,
      total_runs: totals.totalRuns,
      avg_run_length: totals.avgRunLength
    });
    
  } catch (error) {
    console.error('V2 totals fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /health/runs - Runs health checks and invariant validation
app.get('/health/runs', async (req, res) => {
  try {
    // Check for overlapping runs
    const overlapCount = await storage.checkRunOverlaps();
    
    // Check for multiple active runs per user
    const multiActiveCount = await storage.checkMultipleActiveRuns();
    
    // Check for day count accuracy (sample check)
    const dayCountIssues = await storage.validateDayCounts();
    
    // Determine health status
    const isHealthy = overlapCount === 0 && multiActiveCount === 0 && dayCountIssues === 0;
    
    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        overlapping_runs: overlapCount,
        multiple_active_runs: multiActiveCount,
        day_count_issues: dayCountIssues
      }
    };
    
    // Return 503 if unhealthy, 200 if healthy
    res.status(isHealthy ? 200 : 503).json(healthData);
    
  } catch (error) {
    console.error('Runs health check error:', error);
    res.status(503).json({ 
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Export the app for use as a module
export default app;

// Start the server only if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}