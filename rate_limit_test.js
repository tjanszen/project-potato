#!/usr/bin/env node

const http = require('http');

async function makeRequest(path = '/health') {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    }, (res) => {
      resolve({ statusCode: res.statusCode, path });
    });
    
    req.on('error', () => {
      resolve({ statusCode: 'ERROR', path });
    });
    
    req.setTimeout(100, () => {
      req.destroy();
      resolve({ statusCode: 'TIMEOUT', path });
    });
    
    req.end();
  });
}

async function runStressTest() {
  console.log('🚀 Starting rate limit stress test...');
  console.log('Testing against /api/feature-flags (non-health endpoint)');
  
  // Test non-health endpoint (should hit rate limit)
  const results = [];
  const batchSize = 50; // Send in batches to avoid overwhelming
  
  for (let batch = 0; batch < 20; batch++) { // 20 batches of 50 = 1000 requests
    const batchPromises = [];
    for (let i = 0; i < batchSize; i++) {
      batchPromises.push(makeRequest('/api/feature-flags'));
    }
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    const totalRequests = (batch + 1) * batchSize;
    const successCount = results.filter(r => r.statusCode === 200).length;
    const errorCount = results.filter(r => r.statusCode === 429).length;
    
    console.log(`📊 Batch ${batch + 1}/20: Total: ${totalRequests}, 200s: ${successCount}, 429s: ${errorCount}`);
    
    // If we hit rate limit, test one more request to confirm
    if (errorCount > 0) {
      console.log('🔥 Rate limit triggered! Testing request 1001...');
      const extraResult = await makeRequest('/api/feature-flags');
      results.push(extraResult);
      console.log(`📋 Request 1001 result: ${extraResult.statusCode}`);
      break;
    }
  }
  
  // Test health endpoint continues working
  console.log('🏥 Testing /health endpoint after rate limit...');
  const healthResult = await makeRequest('/health');
  console.log(`💚 /health result: ${healthResult.statusCode}`);
  
  // Summary
  const summary = {
    total: results.length,
    success: results.filter(r => r.statusCode === 200).length,
    rateLimited: results.filter(r => r.statusCode === 429).length,
    errors: results.filter(r => r.statusCode !== 200 && r.statusCode !== 429).length,
    healthWorking: healthResult.statusCode === 200
  };
  
  console.log('\n📊 FINAL RESULTS:');
  console.log(`Total requests: ${summary.total}`);
  console.log(`200 responses: ${summary.success}`);
  console.log(`429 responses (rate limited): ${summary.rateLimited}`);
  console.log(`Other errors: ${summary.errors}`);
  console.log(`Health endpoint working: ${summary.healthWorking ? '✅' : '❌'}`);
  
  // Validation
  const testPassed = summary.success >= 900 && summary.rateLimited > 0 && summary.healthWorking;
  console.log(`\n🎯 TEST RESULT: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  return testPassed;
}

if (require.main === module) {
  runStressTest().catch(console.error);
}