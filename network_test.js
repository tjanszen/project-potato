const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Track all requests
const requestLog = [];

app.use('*', (req, res, next) => {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${req.method} ${req.originalUrl}`;
  console.log(logEntry);
  requestLog.push(logEntry);
  next();
});

// Proxy to actual server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url}`);
  }
}));

console.log('Network interceptor running on port 8080');
console.log('Forward requests to http://localhost:8080 to capture traffic');
app.listen(8080);
