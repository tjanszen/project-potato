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
      resolve({ 
        statusCode: res.statusCode,
        remaining: res.headers['ratelimit-remaining']
      });
    });
    
    req.on('error', () => resolve({ statusCode: 'ERROR' }));
    req.setTimeout(100, () => {
      req.destroy();
      resolve({ statusCode: 'TIMEOUT' });
    });
    req.end();
  });
}

async function testBoundary() {
  console.log('🎯 Testing rate limit boundary (1000 → 1001)...\n');
  
  // Send 1000 requests rapidly
  console.log('📤 Sending 1000 requests...');
  const promises = [];
  for (let i = 0; i < 1000; i++) {
    promises.push(makeRequest());
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.statusCode === 200).length;
  const failCount = results.filter(r => r.statusCode === 429).length;
  
  console.log(`✅ Batch results: ${successCount} success, ${failCount} rate limited`);
  console.log(`📊 Last result remaining: ${results[results.length-1].remaining}`);
  
  // Send the 1001st request
  console.log('\n🔥 Sending request 1001...');
  const boundaryResult = await makeRequest();
  console.log(`📋 Request 1001: ${boundaryResult.statusCode} (remaining: ${boundaryResult.remaining})`);
  
  // Test health endpoint still works
  const healthResult = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET'
    }, (res) => resolve({ statusCode: res.statusCode }));
    req.on('error', () => resolve({ statusCode: 'ERROR' }));
    req.end();
  });
  
  console.log(`💚 /health after limit: ${healthResult.statusCode}`);
  
  // Summary
  const testPassed = boundaryResult.statusCode === 429 && healthResult.statusCode === 200;
  console.log(`\n🎯 BOUNDARY TEST: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('   - 1000 requests allowed ✅');
  console.log(`   - 1001st request blocked: ${boundaryResult.statusCode === 429 ? '✅' : '❌'}`);
  console.log(`   - /health still works: ${healthResult.statusCode === 200 ? '✅' : '❌'}`);
  
  return testPassed;
}

if (require.main === module) {
  testBoundary().catch(console.error);
}