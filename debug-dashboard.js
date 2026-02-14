// Debug script for dashboard - Run this in background console

console.log('=== DASHBOARD DEBUG SCRIPT ===\n');

// 1. Check if daily snapshots exist
chrome.storage.local.get(['dailySnapshots'], (result) => {
  console.log('1. DAILY SNAPSHOTS:');
  if (result.dailySnapshots) {
    console.log('✅ Daily snapshots exist');
    console.log('Number of days:', Object.keys(result.dailySnapshots).length);
    console.log('Dates:', Object.keys(result.dailySnapshots));
    console.log('Data:', JSON.stringify(result.dailySnapshots, null, 2));
  } else {
    console.log('❌ No daily snapshots found');
    console.log('This means "Check Now" hasn\'t been run yet or data wasn\'t stored');
  }
  console.log('\n');
});

// 2. Check if dashboard data exists
chrome.storage.local.get(['weeklyDashboardData'], (result) => {
  console.log('2. WEEKLY DASHBOARD DATA:');
  if (result.weeklyDashboardData) {
    console.log('✅ Dashboard data exists');
    console.log('Week:', result.weeklyDashboardData.weekStart, 'to', result.weeklyDashboardData.weekEnd);
    console.log('Summary:', result.weeklyDashboardData.summary);
    console.log('Full data:', JSON.stringify(result.weeklyDashboardData, null, 2));
  } else {
    console.log('❌ No dashboard data found');
    console.log('Dashboard needs to be generated');
  }
  console.log('\n');
});

// 3. Check configuration
chrome.storage.sync.get(null, (config) => {
  console.log('3. CONFIGURATION:');
  console.log('Component:', config.componentName);
  console.log('Webhook URL:', config.slackWebhookUrl ? '✅ Set' : '❌ Not set');
  console.log('Enabled:', config.enabled);
  console.log('Last check:', config.lastCheck);
  console.log('\n');
});

// 4. Test data collection manually
console.log('4. TESTING DATA COLLECTION:');
console.log('Running checkDefects() to collect data...\n');

checkDefects().then(() => {
  console.log('✅ checkDefects() completed');
  console.log('Now checking if data was stored...\n');
  
  setTimeout(() => {
    chrome.storage.local.get(['dailySnapshots'], (result) => {
      if (result.dailySnapshots) {
        console.log('✅ Data stored successfully!');
        console.log('Snapshots:', Object.keys(result.dailySnapshots));
      } else {
        console.log('❌ Data was not stored');
      }
    });
  }, 2000);
}).catch(error => {
  console.error('❌ checkDefects() failed:', error);
});

console.log('\n=== END DEBUG SCRIPT ===');

// Made with Bob
