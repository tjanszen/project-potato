// CRITICAL: Load environment variables FIRST before any modules that read process.env
require('dotenv').config();

// Simple combined server for Project Potato Phase 1B testing
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const morgan = require('morgan');
const crypto = require('crypto');

// Add error handling for imports
let featureFlagService, storage, insertUserSchema, totalsAggregation, totalsInvalidation;
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
  
  console.log('Loading totals aggregation...');
  totalsAggregation = require('./server/totals-aggregation.js');
  console.log('✅ Totals aggregation loaded');
  
  console.log('Loading totals invalidation...');
  totalsInvalidation = require('./server/totals-invalidation.js');
  console.log('✅ Totals invalidation loaded');
} catch (error) {
  console.error('❌ Import error:', error);
  process.exit(1);
}

// Load environment
require('dotenv').config();

// Production logging configuration
const isProduction = process.env.NODE_ENV === 'production';

// Application metrics tracking
const metrics = {
  startTime: Date.now(),
  requests: {
    total: 0,
    errors: 0,
    by_method: {},
    by_endpoint: {},
    response_times: []
  },
  errors: {
    total: 0,
    by_type: {},
    recent: []
  }
};

const logger = {
  info: (message, meta = {}) => {
    const logData = { 
      level: 'info', 
      message, 
      timestamp: new Date().toISOString(),
      ...meta 
    };
    
    if (isProduction) {
      console.log(JSON.stringify(logData));
    } else {
      console.log(`ℹ️ ${message}`, meta);
    }
  },
  
  error: (message, error = null, meta = {}) => {
    metrics.errors.total++;
    
    const errorType = error?.constructor?.name || 'UnknownError';
    metrics.errors.by_type[errorType] = (metrics.errors.by_type[errorType] || 0) + 1;
    
    // Keep recent errors (last 10)
    metrics.errors.recent.unshift({
      message,
      error: error?.message,
      timestamp: new Date().toISOString(),
      ...meta
    });
    if (metrics.errors.recent.length > 10) {
      metrics.errors.recent.pop();
    }
    
    const logData = { 
      level: 'error', 
      message, 
      timestamp: new Date().toISOString(), 
      error: error ? { 
        message: error.message, 
        stack: error.stack,
        name: error.constructor.name 
      } : null,
      ...meta 
    };
    
    if (isProduction) {
      console.error(JSON.stringify(logData));
    } else {
      console.error(`❌ ${message}`, error, meta);
    }
  },
  
  warn: (message, meta = {}) => {
    const logData = { 
      level: 'warn', 
      message, 
      timestamp: new Date().toISOString(), 
      ...meta 
    };
    
    if (isProduction) {
      console.warn(JSON.stringify(logData));
    } else {
      console.warn(`⚠️ ${message}`, meta);
    }
  },
  
  request: (req, res, responseTime, meta = {}) => {
    metrics.requests.total++;
    
    const method = req.method;
    const endpoint = req.route?.path || req.path;
    
    metrics.requests.by_method[method] = (metrics.requests.by_method[method] || 0) + 1;
    metrics.requests.by_endpoint[endpoint] = (metrics.requests.by_endpoint[endpoint] || 0) + 1;
    
    // Track response times (keep last 100)
    metrics.requests.response_times.push(responseTime);
    if (metrics.requests.response_times.length > 100) {
      metrics.requests.response_times.shift();
    }
    
    if (res.statusCode >= 400) {
      metrics.requests.errors++;
    }
    
    const logData = {
      level: 'info',
      type: 'request',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    if (isProduction) {
      console.log(JSON.stringify(logData));
    } else {
      console.log(`📡 ${req.method} ${req.url} ${res.statusCode} ${responseTime}ms [${req.correlationId}]`);
    }
  }
};

logger.info(`Starting application in ${process.env.NODE_ENV || 'development'} mode`);

const app = express();
const PORT = process.env.PORT || 3000;

// Log PORT configuration for debugging
console.log(`🚀 PORT Configuration:`);
console.log(`  - process.env.PORT: ${process.env.PORT || 'undefined'}`);
console.log(`  - Using PORT: ${PORT}`);

// Security Middleware
// HTTPS redirect middleware (for production)
if (isProduction) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

console.log('Updated generalLimiter: 1000 requests per 15min');

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all requests except /health
app.use((req, res, next) => {
  // Skip rate limiting for health endpoint
  if (req.path === '/health') {
    return next();
  }
  
  generalLimiter(req, res, next);
});

// Correlation ID middleware (must be early in middleware stack)
app.use((req, res, next) => {
  req.correlationId = crypto.randomUUID();
  res.set('X-Correlation-ID', req.correlationId);
  next();
});

// Request/Response logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log the request with performance data
    logger.request(req, res, responseTime, {
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      contentLength: res.get('Content-Length')
    });
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
});

// Request validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors', { errors: errors.array(), ip: req.ip });
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Middleware
app.use(cors({
  origin: true, // Allow requests from the frontend
  credentials: true, // Enable sending cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Less restrictive for development
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files from client directory (development)
app.use('/client', express.static(path.join(__dirname, 'client')));

// Serve built React app static files (production)
app.use(express.static(path.join(__dirname, 'dist', 'client')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  try {
    const uptime = Date.now() - metrics.startTime;
    const responseTimes = metrics.requests.response_times;
    
    // Calculate average response time
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    // Calculate percentiles
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
    
    const metricsData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime / 1000),
        human: `${Math.floor(uptime / 1000 / 60)} minutes`
      },
      requests: {
        total: metrics.requests.total,
        errors: metrics.requests.errors,
        error_rate: metrics.requests.total > 0 
          ? ((metrics.requests.errors / metrics.requests.total) * 100).toFixed(2) + '%'
          : '0%',
        by_method: metrics.requests.by_method,
        by_endpoint: metrics.requests.by_endpoint
      },
      performance: {
        avg_response_time_ms: Math.round(avgResponseTime),
        p95_response_time_ms: p95,
        p99_response_time_ms: p99,
        slow_requests: responseTimes.filter(t => t > 500).length
      },
      errors: {
        total: metrics.errors.total,
        by_type: metrics.errors.by_type,
        recent: metrics.errors.recent.slice(0, 5) // Only show last 5
      },
      system: {
        memory: process.memoryUsage(),
        node_version: process.version,
        environment: process.env.NODE_ENV || 'development',
        feature_flag: process.env.FF_POTATO_NO_DRINK_V1 || 'undefined'
      }
    };
    
    logger.info('Metrics requested', { 
      correlationId: req.correlationId,
      totalRequests: metrics.requests.total 
    });
    
    res.json(metricsData);
  } catch (error) {
    logger.error('Error generating metrics', error, { 
      correlationId: req.correlationId 
    });
    res.status(500).json({ 
      error: 'Failed to generate metrics',
      correlationId: req.correlationId 
    });
  }
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

app.post('/api/auth/signup', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('timezone').isString().notEmpty().withMessage('Timezone is required'),
  handleValidationErrors
], async (req, res) => {
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

    // Automatically log user in after signup by setting session
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      // Store user ID in session
      req.session.userId = newUser.id;
      
      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
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

app.post('/api/auth/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
], async (req, res) => {
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

// Logout endpoint (Phase 4A) - placed right after login
app.post('/api/auth/logout', async (req, res) => {
  // Check authentication manually
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
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
    
    // Early guard: Ensure user session exists
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
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
    console.log("Calendar request session:", req.session);
    const dayMarks = await storage.getDayMarksForMonth(req.session.userId, month);
    console.log("Day marks fetched:", JSON.stringify(dayMarks, null, 2));
    
    // DEBUG: Log the exact structure of returned data
    console.log('DEBUG: dayMarks data:', JSON.stringify(dayMarks, null, 2));
    console.log('DEBUG: first mark keys:', dayMarks.length > 0 ? Object.keys(dayMarks[0]) : 'no data');
    
    // Normalize field mapping - handle both camelCase and snake_case, Date and string types
    const markedDates = (Array.isArray(dayMarks) ? dayMarks : []).map(mark => {
      const dateValue = mark.localDate ?? mark.local_date ?? mark.date;
      if (!dateValue) return null;
      // Handle both Date objects and strings, ensure YYYY-MM-DD format
      const dateStr = dateValue instanceof Date 
        ? dateValue.toISOString().slice(0,10) 
        : String(dateValue).slice(0,10);
      return dateStr;
    }).filter(Boolean);
    
    res.json({
      month: month,
      markedDates: markedDates,
      count: markedDates.length
    });
    
  } catch (error) {
    console.error('Calendar fetch error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      correlationId: req.correlationId || 'unknown'
    });
  }
});

// Day marking endpoint (Phase 2C - timezone-aware validation)
app.post('/api/days/:date/no-drink', requireFeatureFlag('ff.potato.no_drink_v1'), requireAuthentication, async (req, res) => {
  try {
    console.log("Mark Day request session:", req.session);
    console.log("Mark Day request params:", req.params);
    
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
      localDate: date,
      value: true // Phase 2E only handles "no drink" = true
    };
    
    // Calculate user's local date (Phase 2E - Event Logging)
    const userLocalDate = new Date(date + 'T12:00:00Z').toLocaleDateString('en-CA', {
      timeZone: user.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Log click event before day marking (Phase 2E - comprehensive audit trail)
    const clickEvent = {
      userId: req.session.userId,
      date: date,
      value: true,
      userLocalDate: userLocalDate,
      userTimezone: user.timezone
    };
    
    try {
      // Always log the event attempt (even if marking fails)
      console.log("Calling storage.logClickEvent with:", JSON.stringify(clickEvent, null, 2));
      await storage.logClickEvent(clickEvent);
    } catch (eventError) {
      // Event logging should not block day marking
      console.warn('Event logging failed:', eventError);
    }
    
    console.log("Calling storage.markDay with:", JSON.stringify(dayMark, null, 2));
    const createdMark = await storage.markDay(dayMark);
    
    // Invalidate totals asynchronously (Phase 7A-3 - invalidation strategy)
    if (totalsInvalidation && totalsInvalidation.invalidateUserTotals) {
      const yearMonth = date.slice(0, 7); // Extract YYYY-MM from YYYY-MM-DD
      setImmediate(async () => {
        try {
          await totalsInvalidation.invalidateUserTotals(storage, req.session.userId, yearMonth);
          logger.info('Totals invalidated after day marking', { 
            userId: req.session.userId, 
            date, 
            yearMonth,
            correlationId: req.correlationId 
          });
        } catch (error) {
          logger.error('Totals invalidation failed after day marking', error, { 
            userId: req.session.userId, 
            date, 
            yearMonth,
            correlationId: req.correlationId 
          });
        }
      });
    }
    
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

// Event retrieval endpoint (Phase 2E - debugging/analytics)
app.get('/api/events', requireFeatureFlag('ff.potato.no_drink_v1'), requireAuthentication, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 events
    const events = await storage.getClickEventsForUser(req.session.userId, limit);
    
    res.json({
      events: events,
      count: events.length,
      message: `Retrieved ${events.length} recent events`
    });
    
  } catch (error) {
    console.error('Event retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// V2 API Endpoints - Runs and Totals (gated behind ff.potato.runs_v2)
app.get('/api/v2/runs', requireFeatureFlag('ff.potato.runs_v2'), requireAuthentication, async (req, res) => {
  try {
    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    
    // Get runs for user with pagination
    const runs = await storage.getRunsForUser ? await storage.getRunsForUser(req.session.userId, { limit, offset }) : [];
    
    // Get total count for pagination
    const totalRuns = await storage.getTotalRunsCount ? await storage.getTotalRunsCount(req.session.userId) : 0;
    const totalPages = Math.ceil(totalRuns / limit);
    
    res.json({
      runs: runs,
      pagination: {
        page,
        limit,
        totalPages,
        totalRuns,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('V2 runs retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v2/totals', requireFeatureFlag('ff.potato.totals_v2'), requireAuthentication, async (req, res) => {
  try {
    // Check if aggregation functions are available
    if (!totalsAggregation || !totalsAggregation.calculateRealTimeTotals) {
      // Fallback to basic calculation if aggregation not available
      const totals = await storage.getTotalsForUser ? await storage.getTotalsForUser(req.session.userId) : {
        total_days: 0,
        longest_run: 0,
        current_run: 0
      };
      return res.json(totals);
    }

    // Use the database pool from storage for aggregation functions
    const dbPool = storage.getRawPool ? storage.getRawPool() : null;
    if (!dbPool) {
      throw new Error('Database pool not available');
    }

    // Run both V1 and V3 calculations for comparison logging
    console.log('[Totals] Running dual V1 and V3 calculations for comparison');
    
    // Always run V1 calculation
    const v1Totals = await totalsAggregation.calculateRealTimeTotals(dbPool, req.session.userId);
    
    // Always run V3 calculation  
    const v3Totals = await totalsAggregation.calculateRealTimeTotalsV3(dbPool, req.session.userId);
    
    // Log both results for comparison
    console.log(`[Totals] V1 Results: totalDays=${v1Totals.totalDays}, longestRun=${v1Totals.longestRun}, currentRun=${v1Totals.currentRun}`);
    console.log(`[Totals] V3 Results: totalDays=${v3Totals.totalDays}, longestRun=${v3Totals.longestRun}, currentRun=${v3Totals.currentRun}`);
    
    // Check for differences and log warnings
    if (v1Totals.currentRun !== v3Totals.currentRun) {
      console.log(`[Totals] WARNING: V1 current_run=${v1Totals.currentRun}, V3 current_run=${v3Totals.currentRun} for user ${req.session.userId}`);
    }
    
    // Always use V1 results for API response (no cutover yet)
    const totals = v1Totals;
    
    // Transform to match API contract
    const response = {
      total_days: totals.totalDays,
      longest_run: totals.longestRun,
      current_run: totals.currentRun
    };
    
    logger.info('V2 totals calculated', { 
      userId: req.session.userId,
      processingTime: totals.processingTimeMs,
      correlationId: req.correlationId 
    });
    
    res.json(response);
    
  } catch (error) {
    logger.error('V2 totals retrieval error', error, { 
      userId: req.session.userId,
      correlationId: req.correlationId 
    });
    
    // Fallback to basic response
    res.json({
      total_days: 0,
      longest_run: 0,
      current_run: 0
    });
  }
});

// Admin endpoint for manual totals invalidation (Phase 7A-3)
app.post('/api/admin/invalidate-totals', requireAuthentication, async (req, res) => {
  try {
    const { userId, yearMonth } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required',
        usage: 'POST { "userId": "uuid", "yearMonth": "2025-09" }' 
      });
    }

    if (!totalsInvalidation || !totalsInvalidation.invalidateUserTotals) {
      return res.status(503).json({ 
        error: 'Totals invalidation service not available' 
      });
    }

    const result = await totalsInvalidation.invalidateUserTotals(storage, userId, yearMonth);
    
    logger.info('Manual totals invalidation completed', { 
      adminUserId: req.session.userId,
      targetUserId: userId,
      yearMonth,
      result,
      correlationId: req.correlationId 
    });
    
    res.json({
      message: 'Totals invalidation completed',
      result
    });

  } catch (error) {
    logger.error('Manual totals invalidation error', error, { 
      adminUserId: req.session.userId,
      correlationId: req.correlationId 
    });
    res.status(500).json({ 
      error: 'Invalidation failed',
      message: error.message 
    });
  }
});

// Health check for runs data integrity
app.get('/health/runs', async (req, res) => {
  try {
    let healthy = true;
    const issues = [];
    
    // Check for run overlaps
    if (storage.checkRunOverlaps) {
      const overlaps = await storage.checkRunOverlaps();
      if (overlaps && overlaps.length > 0) {
        healthy = false;
        issues.push(`Found ${overlaps.length} overlapping runs`);
      }
    }
    
    // Check for multiple active runs per user
    if (storage.checkMultipleActiveRuns) {
      const multipleActive = await storage.checkMultipleActiveRuns();
      if (multipleActive && multipleActive.length > 0) {
        healthy = false;
        issues.push(`Found ${multipleActive.length} users with multiple active runs`);
      }
    }
    
    // Validate day counts
    if (storage.validateDayCounts) {
      const invalidCounts = await storage.validateDayCounts();
      if (invalidCounts && invalidCounts.length > 0) {
        healthy = false;
        issues.push(`Found ${invalidCounts.length} runs with invalid day counts`);
      }
    }
    
    const response = {
      healthy,
      timestamp: new Date().toISOString(),
      ...(issues.length > 0 && { issues })
    };
    
    res.status(healthy ? 200 : 503).json(response);
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      healthy: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all handler: serve React app for client-side routing
// This must come AFTER all API routes
app.use((req, res, next) => {
  // Skip if this is an API route or health check
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return next();
  }
  
  // For all other routes, serve React app index.html
  res.sendFile(path.join(__dirname, 'dist', 'client', 'index.html'), (err) => {
    if (err) {
      console.error('Error serving React app:', err);
      res.status(500).send('Error loading application');
    }
  });
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
  console.log(`Server listening on port ${PORT}`);
  console.log('Express server initialized');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});