"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const dotenv_1 = require("dotenv");
const feature_flags_js_1 = require("./feature-flags.js");
// Load environment variables
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
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
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
