// Test script to directly call markCompleted and see trace logs
const { markCompleted } = require('./server/league-membership.js');

const testUserId = '0b9e1513-e90a-4a01-a00c-051a6dad16a4';
const testLeagueId = 1;

console.log('========================================');
console.log('Testing markCompleted function directly');
console.log('========================================');

markCompleted(testUserId, testLeagueId)
  .then(result => {
    console.log('\n========================================');
    console.log('SUCCESS - Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('========================================');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n========================================');
    console.error('ERROR:', error.message);
    console.error(error.stack);
    console.error('========================================');
    process.exit(1);
  });
