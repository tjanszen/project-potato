// Simulate the exact day marking flow with network capture
console.log("🧪 TESTING: Does TotalsPanel re-fetch /api/v2/totals after day marking?");
console.log("=".repeat(70));

// Simulate API client behavior
const simulateAPIFlow = () => {
  console.log("1. ✅ User clicks day in calendar");
  console.log("2. ✅ DayDrawer opens and user clicks 'Mark No Drink'");
  console.log("3. ✅ executeMarkNoDrink() calls apiClient.markDay()");
  console.log("4. 📡 POST /api/days/2025-09-02/no-drink");
  console.log("5. ✅ Success response received");
  console.log("6. ✅ onDayMarked?.() callback triggered");
  console.log("7. ✅ handleDayMarkedSuccess() in CalendarPage");
  console.log("8. 🔄 queryClient.invalidateQueries({ queryKey: ['totals'] })");
  console.log("");
  console.log("🔍 CRITICAL QUESTION: Does step 8 trigger /api/v2/totals request?");
  console.log("");
  
  // Test if server is responding to API calls
  console.log("Testing API endpoints...");
  return Promise.all([
    fetch('http://localhost:3000/api/feature-flags/ff.potato.runs_v2')
      .then(r => r.json())
      .then(data => console.log("✅ Feature flag API working:", data.enabled))
      .catch(e => console.log("❌ Feature flag API failed:", e.message)),
      
    fetch('http://localhost:3000/api/v2/totals')
      .then(r => r.json()) 
      .then(data => console.log("✅ Totals API working:", Object.keys(data)))
      .catch(e => console.log("❌ Totals API failed:", e.message))
  ]);
};

simulateAPIFlow();
