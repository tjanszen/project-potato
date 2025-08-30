import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { config } from 'dotenv';
import { featureFlagService } from './feature-flags.js';
import { storage } from './storage.js';

// Load environment variables
config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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

// All app functionality gated behind main feature flag
app.use('/api/auth', requireFeatureFlag('ff.potato.no_drink_v1'));
app.use('/api/calendar', requireFeatureFlag('ff.potato.no_drink_v1'));
app.use('/api/days', requireFeatureFlag('ff.potato.no_drink_v1'));
app.use('/api/me', requireFeatureFlag('ff.potato.no_drink_v1'));

// Placeholder routes (will be implemented in later phases)
app.post('/api/auth/signup', (req, res) => {
  res.json({ message: 'Signup endpoint - Phase 1' });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ message: 'Login endpoint - Phase 1' });
});

app.get('/api/me', (req, res) => {
  res.json({ message: 'User profile endpoint - Phase 1' });
});

app.get('/api/calendar', (req, res) => {
  res.json({ message: 'Calendar endpoint - Phase 2' });
});

app.post('/api/days/:date/no-drink', (req, res) => {
  res.json({ message: 'Day marking endpoint - Phase 2' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Feature flag ff.potato.no_drink_v1: ${featureFlagService.isEnabled('ff.potato.no_drink_v1')}`);
});