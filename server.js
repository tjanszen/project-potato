// Simple deployment server for Project Potato
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Root endpoint (required for health checks)
app.get('/', (req, res) => {
  res.status(200).send('Project Potato - Phase 0 Foundation Server');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    phase: 'Phase 0 - Foundation'
  });
});

// Feature flag info endpoint
app.get('/api/feature-flags', (req, res) => {
  res.json({
    'ff.potato.no_drink_v1': {
      enabled: false,
      description: 'Main feature flag for habit tracking functionality'
    }
  });
});

// Export the app for use as a module
module.exports = app;