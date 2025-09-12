#!/usr/bin/env node

// Simple debug script to test rate limiting behavior
const http = require('http');

async function makeRequest(path = '/api/feature-flags') {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'rate-limit-test'
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ 
          statusCode: res.statusCode, 
          headers: res.headers,
          body: body.substring(0, 100) // First 100 chars
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({ statusCode: 'ERROR', error: err.message });
    });
    
    req.setTimeout(1000, () => {
      req.destroy();
      resolve({ statusCode: 'TIMEOUT' });
    });
    
    req.end();
  });
}

async function debugRateLimit() {
  console.log('🔍 Debugging rate limit configuration...\n');
  
  // Test 1: Check feature flags
  console.log('1. Testing feature flag endpoint:');
  const flagResult = await makeRequest('/api/feature-flags/ff.potato.dev_rate_limit');
  console.log(`   Status: ${flagResult.statusCode}`);
  console.log(`   Response: ${flagResult.body}`);
  console.log(`   Rate Limit Headers: ${JSON.stringify({
    limit: flagResult.headers['ratelimit-limit'],
    remaining: flagResult.headers['ratelimit-remaining'], 
    reset: flagResult.headers['ratelimit-reset']
  })}\n`);
  
  // Test 2: Send rapid requests to trigger rate limit
  console.log('2. Sending rapid requests to test rate limiting:');
  for (let i = 1; i <= 10; i++) {
    const result = await makeRequest('/api/feature-flags');
    console.log(`   Request ${i}: ${result.statusCode} - Remaining: ${result.headers['ratelimit-remaining'] || 'N/A'}`);
    
    if (result.statusCode === 429) {
      console.log(`   🔥 Rate limit triggered at request ${i}!`);
      break;
    }
  }
  
  // Test 3: Check health endpoint
  console.log('\n3. Testing health endpoint (should be exempt):');
  const healthResult = await makeRequest('/health');
  console.log(`   Status: ${healthResult.statusCode}`);
  console.log(`   Has rate limit headers: ${!!healthResult.headers['ratelimit-limit']}`);
}

if (require.main === module) {
  debugRateLimit().catch(console.error);
}