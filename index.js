// Main entry point for Project Potato - Phase 1B
// Serves both the backend API and frontend testing interface

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

// Start the backend server on a different port
const backendServer = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' }
});

// Create simple frontend server
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from client directory
app.use('/client', express.static(path.join(__dirname, 'client')));

// Redirect root to our test interface
app.get('/', (req, res) => {
  res.redirect('/client/simple-test.html');
});

// Health check for this frontend server
app.get('/frontend-health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Frontend server running',
    testPage: '/client/simple-test.html'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🥔 Project Potato frontend running on port ${PORT}`);
  console.log(`📱 Test interface: http://localhost:${PORT}/client/simple-test.html`);
  console.log(`🔧 Backend API: http://localhost:3001`);
});

// Handle cleanup
process.on('SIGTERM', () => {
  backendServer.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  backendServer.kill();
  process.exit(0);
});