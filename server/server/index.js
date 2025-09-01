"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const dotenv_1 = require("dotenv");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const feature_flags_js_1 = require("./feature-flags.js");
const storage_js_1 = require("./storage.js");
const schema_js_1 = require("../shared/schema.js");
// Load environment variables
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000', 10);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
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
    const flag = feature_flags_js_1.featureFlagService.getFlag(flagName);
    if (!flag) {
        return res.status(404).json({ error: 'Feature flag not found' });
    }
    res.json(flag);
});
app.get('/api/feature-flags', (req, res) => {
    const flags = feature_flags_js_1.featureFlagService.getAllFlags();
    res.json(flags);
});
// Admin endpoint to toggle feature flags (for testing Phase 1A)
app.post('/api/admin/toggle-flag/:flagName', (req, res) => {
    const { flagName } = req.params;
    const newState = feature_flags_js_1.featureFlagService.toggleFlag(flagName);
    res.json({
        flag: flagName,
        enabled: newState,
        message: `Feature flag ${flagName} is now ${newState ? 'enabled' : 'disabled'}`
    });
});
// Feature flag gating middleware
const requireFeatureFlag = (flagName) => {
    return (req, res, next) => {
        if (!feature_flags_js_1.featureFlagService.isEnabled(flagName)) {
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
// Auth routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        // Validate request body
        const validationResult = schema_js_1.insertUserSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validationResult.error.errors
            });
        }
        const { email, password, timezone } = validationResult.data;
        // Check if user already exists
        const existingUser = await storage_js_1.storage.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        // Create user
        const newUser = await storage_js_1.storage.createUser({
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
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
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
    console.log(`Feature flag ff.potato.no_drink_v1: ${feature_flags_js_1.featureFlagService.isEnabled('ff.potato.no_drink_v1')}`);
});
