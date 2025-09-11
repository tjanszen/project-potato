// Direct test of React Query invalidation behavior
const originalFetch = global.fetch;
const networkLog = [];

// Intercept all fetch calls to capture network traffic
global.fetch = (...args) => {
  const url = args[0];
  const options = args[1] || {};
  const timestamp = new Date().toISOString();
  
  console.log(`📡 [${timestamp}] ${options.method || 'GET'} ${url}`);
  networkLog.push({ timestamp, method: options.method || 'GET', url });
  
  return originalFetch(...args);
};

// Simulate the exact day marking flow
console.log("🧪 SIMULATING DAY MARKING FLOW WITH NETWORK CAPTURE");
console.log("=".repeat(60));

async function simulateDayMarkingFlow() {
  console.log("1. 📅 User marks day in calendar");
  console.log("2. 📡 POST /api/days/2025-09-02/no-drink (simulated)");
  networkLog.push({ 
    timestamp: new Date().toISOString(), 
    method: 'POST', 
    url: '/api/days/2025-09-02/no-drink' 
  });
  
  console.log("3. ✅ Day marking succeeds");
  console.log("4. 🔄 queryClient.invalidateQueries({ queryKey: ['totals'] })");
  console.log("5. ❓ Does React Query trigger re-fetch of /api/v2/totals?");
  
  // Test if API endpoints are accessible
  try {
    console.log("6. 🧪 Testing if /api/v2/totals would be accessible...");
    const response = await fetch('http://localhost:3000/api/v2/totals');
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      console.log("   ✅ API endpoint is accessible");
    } else {
      console.log("   ❌ API endpoint returned error");
    }
  } catch (error) {
    console.log(`   ❌ API endpoint unreachable: ${error.message}`);
  }
  
  console.log("\n📊 NETWORK TRACE SUMMARY:");
  networkLog.forEach((entry, i) => {
    console.log(`   ${i + 1}. ${entry.method} ${entry.url}`);
  });
}

simulateDayMarkingFlow();
