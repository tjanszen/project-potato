#!/usr/bin/env node

const http = require('http');

async function makeRequest() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/feature-flags',
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ 
          statusCode: res.statusCode,
          remaining: res.headers['ratelimit-remaining'],
          limit: res.headers['ratelimit-limit'],
          body: body.length > 0 ? JSON.parse(body) : null
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({ statusCode: 'ERROR', error: err.message });
    });
    
    req.setTimeout(5000);
    req.end();
  });
}

async function testExactBoundary() {
  console.log('🎯 Testing exact 1000 vs 1001 boundary...\n');
  
  // Check initial state
  const initial = await makeRequest();
  console.log(`📊 Initial: ${initial.statusCode}, Limit: ${initial.limit}, Remaining: ${initial.remaining}`);
  
  // If remaining is less than 999, wait for reset (or start with fresh server)
  if (parseInt(initial.remaining) < 999) {
    console.log('⚠️  Rate limit window not fresh. Starting test anyway...');
  }
  
  const startRemaining = parseInt(initial.remaining);
  const requestsNeeded = startRemaining + 1; // +1 to exceed the limit
  
  console.log(`📤 Sending ${requestsNeeded} requests to exceed limit...`);
  
  let last200Request = null;
  let first429Request = null;
  
  for (let i = 1; i <= requestsNeeded; i++) {
    const result = await makeRequest();
    
    if (i <= 5 || i % 100 === 0 || result.statusCode === 429 || i === requestsNeeded) {
      console.log(`   Request ${i}: ${result.statusCode} (remaining: ${result.remaining})`);
    }
    
    if (result.statusCode === 200) {
      last200Request = { number: i, remaining: result.remaining };
    }
    
    if (result.statusCode === 429 && !first429Request) {
      first429Request = { number: i, message: result.body?.error };
      console.log(`🔥 First 429 at request ${i}: ${result.body?.error}`);
      break;
    }
  }
  
  // Test health endpoint
  const healthCheck = await new Promise(resolve => {
    const req = http.request({
      hostname: 'localhost', 
      port: 3000,
      path: '/health'
    }, res => resolve({ statusCode: res.statusCode }));
    req.on('error', () => resolve({ statusCode: 'ERROR' }));
    req.end();
  });
  
  console.log(`💚 /health after rate limit: ${healthCheck.statusCode}`);
  
  // Results
  console.log('\n📋 RESULTS:');
  console.log(`   Last 200 response: Request ${last200Request?.number} (remaining: ${last200Request?.remaining})`);
  console.log(`   First 429 response: ${first429Request ? `Request ${first429Request.number}` : 'None'}`);
  console.log(`   Health endpoint: ${healthCheck.statusCode}`);
  
  const success = first429Request && healthCheck.statusCode === 200;
  console.log(`\n🎯 TEST RESULT: ${success ? '✅ PASSED' : '❌ FAILED'}`);
  
  return success;
}

if (require.main === module) {
  testExactBoundary().catch(console.error);
}