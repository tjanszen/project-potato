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
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
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
        details: validationResult.error.errors 
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