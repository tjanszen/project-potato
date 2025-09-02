// Simple combined server for Project Potato Phase 1B testing
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');

// Add error handling for imports
let featureFlagService, storage, insertUserSchema;
try {
  console.log('Loading feature flags...');
  ({ featureFlagService } = require('./server/feature-flags.js'));
  console.log('✅ Feature flags loaded');
  
  console.log('Loading storage...');
  ({ storage } = require('./server/storage.js'));
  console.log('✅ Storage loaded');
  
  console.log('Loading schema...');
  ({ insertUserSchema } = require('./shared/schema.js'));
  console.log('✅ Schema loaded');
} catch (error) {
  console.error('❌ Import error:', error);
  process.exit(1);
}

// Load environment
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files from client directory
app.use('/client', express.static(path.join(__dirname, 'client')));

// Root route
app.get("/", (req, res) => {
  res.send("✅ Potato backend is running");
});

// Health check
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

// Admin endpoint to toggle feature flags (for testing)
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

// Feature flag gating middleware
const requireFeatureFlag = (flagName) => {
  return (req, res, next) => {
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

// Auth routes (gated behind feature flag)
app.use('/api/auth', requireFeatureFlag('ff.potato.no_drink_v1'));

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

    const { email, password, timezone } = validationResult.data;

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await storage.createUser({
      email,
      password,
      timezone,
      passwordHash
    });

    // Return user without password hash
    const { passwordHash: _, ...userResponse } = newUser;
    res.status(201).json({ 
      message: 'User created successfully',
      user: userResponse 
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

// Authentication middleware
const requireAuthentication = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// User profile endpoint (gated behind feature flag and authentication)
app.get('/api/me', requireFeatureFlag('ff.potato.no_drink_v1'), requireAuthentication, async (req, res) => {
  try {
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      // Session has user ID but user doesn't exist (edge case)
      req.session.destroy();
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Return user profile data without password hash
    const { passwordHash: _, ...userProfile } = user;
    res.json({
      user: userProfile
    });
  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calendar endpoint (Phase 2A - gated behind feature flag and authentication)
app.get('/api/calendar', requireFeatureFlag('ff.potato.no_drink_v1'), requireAuthentication, async (req, res) => {
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
    const dayMarks = await storage.getDayMarksForMonth(req.session.userId, month);
    
    // Format response data
    const markedDates = dayMarks.map(mark => mark.date);
    
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

// Day marking endpoint (Phase 2C - timezone-aware validation)
app.post('/api/days/:date/no-drink', requireFeatureFlag('ff.potato.no_drink_v1'), requireAuthentication, async (req, res) => {
  try {
    const { date } = req.params;
    
    // Get user data including timezone
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Validate date parameter format (YYYY-MM-DD)
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ 
        error: 'Date parameter is required',
        format: 'YYYY-MM-DD (e.g., 2025-06-15)'
      });
    }
    
    // Validate date format with regex
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format',
        format: 'YYYY-MM-DD (e.g., 2025-06-15)',
        received: date
      });
    }
    
    // Additional validation: ensure it's a valid date
    const parsedDate = new Date(date + 'T00:00:00Z');
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({ 
        error: 'Invalid date',
        message: 'Please provide a valid calendar date',
        received: date
      });
    }
    
    // Calculate "today" in user's timezone (Phase 2C)
    const now = new Date();
    const todayInUserTimezone = new Date(now.toLocaleString("en-CA", {
      timeZone: user.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }));
    const userToday = todayInUserTimezone.toISOString().slice(0, 10);
    
    // Validate date is not before 2025-01-01 in user's timezone
    if (date < '2025-01-01') {
      return res.status(400).json({ 
        error: 'Date too early',
        message: 'Cannot mark dates before 2025-01-01',
        received: date,
        userTimezone: user.timezone
      });
    }
    
    // Validate date is not in the future (based on user's timezone)
    if (date > userToday) {
      return res.status(400).json({ 
        error: 'Future date not allowed',
        message: 'Cannot mark dates in the future',
        received: date,
        todayInYourTimezone: userToday,
        yourTimezone: user.timezone
      });
    }
    
    // Create day mark entry
    const dayMark = {
      userId: req.session.userId,
      date: date,
      value: true // Phase 2C only handles "no drink" = true
    };
    
    const createdMark = await storage.markDay(dayMark);
    
    res.status(201).json({
      message: 'Day marked successfully',
      data: {
        date: createdMark.date,
        value: createdMark.value,
        updatedAt: createdMark.updatedAt
      },
      timezone: {
        yourTimezone: user.timezone,
        todayInYourTimezone: userToday
      }
    });
    
  } catch (error) {
    console.error('Day marking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});