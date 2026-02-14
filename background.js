// Background service worker for defect triaging automation

// Default configuration
const DEFAULT_CONFIG = {
  slackWebhookUrl: '',
  componentName: 'Messaging',
  checkTime: '10:00', // 10:00 AM
  enabled: true,
  lastCheck: null
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Defect Triaging Notifier installed');
  
  // Load or set default configuration
  const config = await getConfig();
  if (!config.slackWebhookUrl) {
    await chrome.storage.sync.set(DEFAULT_CONFIG);
  }
  
  // Set up daily alarm
  setupDailyAlarm();
  
  // Set up session keepalive
  setupSessionKeepalive();
  
  // Set up weekly dashboard
  console.log('Setting up weekly dashboard...');
  await setupWeeklyDashboardAlarm();
});

// Get configuration from storage
async function getConfig() {
  const result = await chrome.storage.sync.get(DEFAULT_CONFIG);
  return result;
}

// Set up daily alarm for checking defects
async function setupDailyAlarm() {
  const config = await getConfig();
  
  if (!config.enabled) {
    console.log('Automation is disabled');
    return;
  }
  
  // Clear only the daily alarm (not keepalive)
  await chrome.alarms.clear('dailyDefectCheck');
  
  // Parse check time (format: "HH:MM")
  const [hours, minutes] = config.checkTime.split(':').map(Number);
  
  // Calculate next check time
  const now = new Date();
  const nextCheck = new Date();
  nextCheck.setHours(hours, minutes, 0, 0);
  
  // If time has passed today, schedule for tomorrow
  if (nextCheck <= now) {
    nextCheck.setDate(nextCheck.getDate() + 1);
  }
  
  const delayInMinutes = (nextCheck - now) / (1000 * 60);
  
  // Create alarm
  chrome.alarms.create('dailyDefectCheck', {
    delayInMinutes: delayInMinutes,
    periodInMinutes: 24 * 60 // Repeat every 24 hours
  });
  
  console.log(`Next defect check scheduled for: ${nextCheck.toLocaleString()}`);
}

// Set up session keepalive to prevent IBM session expiry
async function setupSessionKeepalive() {
  // Clear existing alarms
  await chrome.alarms.clear('keepSessionAlive');
  await chrome.alarms.clear('autoRetryCheck');
  
  // Create alarm to refresh session every 2 hours (reduces API calls)
  chrome.alarms.create('keepSessionAlive', {
    delayInMinutes: 1, // Start after 1 minute
    periodInMinutes: 120 // Repeat every 2 hours
  });
  
  // Create separate alarm for quick auto-retry check (every 1 minute)
  chrome.alarms.create('autoRetryCheck', {
    delayInMinutes: 0.5, // Start after 30 seconds
    periodInMinutes: 1 // Check every 1 minute for auto-retry
  });
  
  console.log('Session keepalive enabled - will refresh IBM session every 2 hours');
  console.log('Auto-retry check enabled - will check for login every 1 minute');
}

// Keep IBM session alive by making a lightweight request
async function keepSessionAlive() {
  try {
    console.log('🔔 Keepalive triggered at:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    
    // Make a lightweight HEAD request to keep session alive
    const response = await fetch('https://libh-proxy1.fyre.ibm.com/buildBreakReport/', {
      method: 'HEAD',
      credentials: 'include', // Include cookies
      cache: 'no-cache'
    });
    
    if (response.ok) {
      console.log('✓ IBM session keepalive successful');
    } else {
      console.log('⚠️ IBM session keepalive returned status:', response.status);
    }
  } catch (error) {
    console.error('Session keepalive error:', error.message);
    // Don't throw - this is a background task
  }
}

// Quick check for auto-retry without making API calls
async function checkForAutoRetry() {
  try {
    // Check if we had a previous login error
    const storage = await chrome.storage.local.get(['lastLoginError']);
    if (storage.lastLoginError) {
      console.log('🔍 Auto-retry check: Login error detected, attempting defect check...');
      await chrome.storage.local.remove(['lastLoginError']);
      // Trigger defect check which will auto-retry
      await checkDefects();
    }
  } catch (error) {
    console.error('Auto-retry check error:', error.message);
  }
}

// Handle alarm trigger
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyDefectCheck') {
    console.log('Daily defect check triggered');
    await checkDefects();
  } else if (alarm.name === 'keepSessionAlive') {
    console.log('Session keepalive triggered');
    await keepSessionAlive();
  } else if (alarm.name === 'autoRetryCheck') {
    // Quick check for auto-retry (no API call unless needed)
    await checkForAutoRetry();
  } else if (alarm.name === 'weeklyDashboard') {
    console.log('Weekly dashboard triggered');
    await sendWeeklyDashboardNotification();
  }
});

// Send Slack notification grouped by component
async function sendSlackNotificationGrouped(webhookUrl, componentDefectsMap, totalDefects) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  
  let message;
  
  if (totalDefects === 0) {
    message = `✅ No Untriaged Defects\n\nGreat job! There are currently no untriaged defects for any of your monitored components.\n\nLast checked: ${timestamp}`;
  } else {
    const defectWord = totalDefects === 1 ? 'Defect' : 'Defects';
    message = `⚠️ ${totalDefects} Untriaged ${defectWord}\n\n`;
    message += `Found ${totalDefects} untriaged ${defectWord.toLowerCase()} across ${componentDefectsMap.length} component(s).\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Add defects grouped by component
    componentDefectsMap.forEach((componentData, componentIndex) => {
      const { componentName, defects } = componentData;
      const componentDefectCount = defects.length;
      
      message += `📦 ${componentName} (${componentDefectCount} ${componentDefectCount === 1 ? 'defect' : 'defects'})\n\n`;
      
      // Show up to 5 defects per component
      const defectsToShow = defects.slice(0, 5);
      
      defectsToShow.forEach((defect, index) => {
        const defectLink = `https://wasrtc.hursley.ibm.com:9443/jazz/web/projects/WS-CD#action=com.ibm.team.workitem.viewWorkItem&id=${defect.id}`;
        
        message += `${index + 1}. Defect ID: ${defect.id}\n`;
        message += `   Link: ${defectLink}\n`;
        message += `   Summary: ${defect.summary}\n`;
        message += `   Triage Tags: ${defect.triageTags}\n`;
        message += `   State: ${defect.state}\n`;
        message += `   Owner: ${defect.owner}\n`;
        
        if (index < defectsToShow.length - 1) {
          message += `\n`;
        }
      });
      
      if (defects.length > 5) {
        message += `\n... and ${defects.length - 5} more defect(s) for ${componentName}\n`;
      }
      
      // Add separator between components
      if (componentIndex < componentDefectsMap.length - 1) {
        message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      }
    });
    
    message += `\n\nLast checked: ${timestamp}`;
  }
  
  // Send to Slack
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });
  
  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.status}`);
  }
  
  console.log('Slack notification sent successfully');
}

// Send error notification to Slack
async function sendErrorNotification(webhookUrl, error) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  
  let errorMessage = error.message || 'Unknown error';
  let errorDetails = '';
  
  // Provide specific guidance based on error type
  if (errorMessage.includes('Not logged in')) {
    errorDetails = '\n\nAction Required:\n• Open Chrome and visit https://libh-proxy1.fyre.ibm.com/buildBreakReport/\n• Log in with your W3 ID credentials\n• The extension will work once you\'re logged in';
  } else if (errorMessage.includes('API request failed')) {
    errorDetails = '\n\nPossible Causes:\n• IBM Build Break Report system is down\n• Network connectivity issues\n• VPN connection required';
  } else if (errorMessage.includes('Slack notification failed')) {
    errorDetails = '\n\nPossible Causes:\n• Invalid Slack webhook URL\n• Slack workspace permissions changed\n• Network connectivity issues';
  }
  
  const message = `🚨 Defect Triaging Extension Error\n\n` +
                  `The automated defect check encountered an error:\n\n` +
                  `Error: ${errorMessage}${errorDetails}\n\n` +
                  `Time: ${timestamp}`;
  
  // Send to Slack
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });
  
  if (!response.ok) {
    throw new Error(`Error notification to Slack failed: ${response.status}`);
  }
  
  console.log('Error notification sent to Slack');
}

// Main function to check defects and send notification
async function checkDefects() {
  try {
    const config = await getConfig();
    
    if (!config.slackWebhookUrl) {
      console.error('Slack webhook URL not configured');
      return;
    }
    
    // Parse component names (comma-separated)
    const componentNames = config.componentName
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (componentNames.length === 0) {
      console.error('No components configured');
      return;
    }
    
    console.log(`Checking defects for ${componentNames.length} component(s): ${componentNames.join(', ')}`);
    
    // Fetch defects for all components and group by component
    const componentDefectsMap = [];
    let totalDefects = 0;
    
    for (const componentName of componentNames) {
      console.log(`Fetching defects for: ${componentName}`);
      
      const apiUrl = `https://libh-proxy1.fyre.ibm.com/buildBreakReport/rest2/defects/buildbreak/fas?fas=${encodeURIComponent(componentName)}`;
      
      const response = await fetch(apiUrl, {
        credentials: 'include', // Use browser's cookies
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Check for authentication/redirect responses
      if (response.status === 401 || response.status === 403) {
        throw new Error('Not logged in to IBM system. Please log in to https://libh-proxy1.fyre.ibm.com/buildBreakReport/');
      }
      
      if (!response.ok) {
        throw new Error(`API request failed for ${componentName}: ${response.status} ${response.statusText}`);
      }
      
      // Check content type to ensure we got JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Likely got HTML login page instead of JSON
        throw new Error('Not logged in to IBM system. Please log in to https://libh-proxy1.fyre.ibm.com/buildBreakReport/');
      }
      
      const data = await response.json();
      
      // Check if authentication is required (additional check)
      if (data.operation === 'login' || data.redirect || data.error === 'unauthorized') {
        throw new Error('Not logged in to IBM system. Please log in to https://libh-proxy1.fyre.ibm.com/buildBreakReport/');
      }
      
      // Check if data is empty or invalid
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        console.warn(`Empty response for ${componentName} - might indicate login issue`);
      }
      
      // Parse defects for this component
      const componentDefects = parseDefects(data, componentName);
      
      if (componentDefects.length > 0) {
        componentDefectsMap.push({
          componentName: componentName,
          defects: componentDefects
        });
        totalDefects += componentDefects.length;
      }
      
      console.log(`Found ${componentDefects.length} untriaged defects for ${componentName}`);
    }
    
    console.log(`Total: ${totalDefects} untriaged defects across all components`);
    
    // Store daily snapshot for weekly dashboard
    await storeDailySnapshot(componentDefectsMap, totalDefects);
    
    // Send Slack notification grouped by component
    await sendSlackNotificationGrouped(config.slackWebhookUrl, componentDefectsMap, totalDefects);
    
    // Update last check time
    await chrome.storage.sync.set({ lastCheck: new Date().toISOString() });
    
    console.log('✅ Defect check complete - Slack notification sent');
    
  } catch (error) {
    console.error('❌ Error checking defects:', error);
    
    // Mark that we had an error for auto-retry
    // This includes login errors and network errors (laptop was off)
    if (error.message && (error.message.includes('Not logged in') || error.message.includes('Failed to fetch'))) {
      await chrome.storage.local.set({ lastLoginError: new Date().toISOString() });
      console.log('💾 Error recorded - will auto-retry when connection is restored');
    }
    
    // Send error notification to Slack
    try {
      const config = await getConfig();
      if (config.slackWebhookUrl) {
        await sendErrorNotification(config.slackWebhookUrl, error);
      }
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError);
    }
  }
}

// Parse defects from API response
function parseDefects(data, componentName) {
  const untriagedDefects = [];
  
  // Handle different response structures
  let defectsList = [];
  
  if (Array.isArray(data)) {
    defectsList = data;
  } else if (data.defects && Array.isArray(data.defects)) {
    defectsList = data.defects;
  } else if (data.untriagedDefects && Array.isArray(data.untriagedDefects)) {
    defectsList = data.untriagedDefects;
  }
  
  // Filter and format ONLY untriaged defects
  // Untriaged = defects that DO NOT have any triaged tags
  defectsList.forEach(defect => {
    // Get triage tags
    let triageTags = defect.triageTags || defect.tags || [];
    
    // Ensure it's an array
    if (!Array.isArray(triageTags)) {
      triageTags = [];
    }
    
    // A defect is untriaged if it does NOT have any of these tags:
    // - test_bug or test
    // - product_bug or product
    // - infrastructure_bug or infrastructure
    // - any tag containing these keywords
    const hasTriagedTag = triageTags.some(tag => {
      const lowerTag = tag.toLowerCase();
      return lowerTag.includes('test_bug') ||
             lowerTag.includes('product_bug') ||
             lowerTag.includes('infrastructure_bug') ||
             lowerTag === 'test' ||
             lowerTag === 'product' ||
             lowerTag === 'infrastructure';
    });
    
    const isUntriaged = !hasTriagedTag;
    
    if (isUntriaged) {
      // Convert tags to string for display
      const triageTagsStr = JSON.stringify(triageTags);
      untriagedDefects.push({
        id: defect.id || defect.defectId || 'N/A',
        summary: defect.summary || defect.description || 'N/A',
        buildsReported: defect.buildsReported || defect.buildCount || 'N/A',
        triageTags: triageTagsStr,
        state: defect.state || defect.status || 'Open',
        owner: defect.owner || defect.assignee || 'Unassigned',
        functionalArea: defect.functionalArea || componentName
      });
    }
  });
  
  return untriagedDefects;
}

// Send notification to Slack
async function sendSlackNotification(webhookUrl, componentName, defects) {
  const defectCount = defects.length;
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  
  let message;
  
  if (defectCount === 0) {
    message = `✅ No Untriaged Defects\n\nGreat job! There are currently no untriaged defects for the ${componentName} component.\n\nLast checked: ${timestamp}`;
  } else {
    const defectWord = defectCount === 1 ? 'defect' : 'defects';
    message = `⚠️ ${defectCount} Untriaged ${defectWord.charAt(0).toUpperCase() + defectWord.slice(1)}\n\n`;
    message += `There ${defectCount === 1 ? 'is' : 'are'} ${defectCount} untriaged ${defectWord} for the ${componentName} component that need${defectCount === 1 ? 's' : ''} attention.\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Add details for each defect (limit to first 10)
    const defectsToShow = defects.slice(0, 10);
    
    defectsToShow.forEach((defect, index) => {
      const defectLink = `https://wasrtc.hursley.ibm.com:9443/jazz/web/projects/WS-CD#action=com.ibm.team.workitem.viewWorkItem&id=${defect.id}`;
      
      message += `${index + 1}. Defect ID: ${defect.id}\n`;
      message += `   Link: ${defectLink}\n`;
      message += `   Summary: ${defect.summary}\n`;
      message += `   Triage Tags: ${defect.triageTags}\n`;
      message += `   State: ${defect.state}\n`;
      message += `   Owner: ${defect.owner}\n`;
      
      if (index < defectsToShow.length - 1) {
        message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      }
    });
    
    if (defects.length > 10) {
      message += `\n\n... and ${defects.length - 10} more defect(s)`;
    }
    
    message += `\n\nLast checked: ${timestamp}`;
  }
  
  // Send to Slack
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });
  
  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.status}`);
  }
  
  console.log('Slack notification sent successfully');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkNow') {
    checkDefects().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'updateSchedule') {
    setupDailyAlarm().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'openDashboard') {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    chrome.tabs.create({ url: dashboardUrl });
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'generateDashboard') {
    generateWeeklyDashboard().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// ============================================
// WEEKLY DASHBOARD FUNCTIONALITY
// ============================================

// Set up weekly dashboard alarm for Monday 11 AM
async function setupWeeklyDashboardAlarm() {
  const config = await getConfig();
  
  if (!config.enabled) {
    console.log('Automation is disabled - weekly dashboard also disabled');
    return;
  }
  
  // Clear existing weekly alarm
  await chrome.alarms.clear('weeklyDashboard');
  
  // Calculate next Monday 11:00 AM IST
  const now = new Date();
  const nextMonday = new Date();
  
  // Set to 11:00 AM
  nextMonday.setHours(11, 0, 0, 0);
  
  // Find next Monday
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  
  // If it's Monday and time has passed, schedule for next Monday
  if (now.getDay() === 1 && now.getHours() >= 11) {
    nextMonday.setDate(nextMonday.getDate() + 7);
  }
  
  const delayInMinutes = (nextMonday - now) / (1000 * 60);
  
  // Create alarm for Monday 11 AM, repeat weekly
  chrome.alarms.create('weeklyDashboard', {
    delayInMinutes: delayInMinutes,
    periodInMinutes: 7 * 24 * 60 // Repeat every 7 days
  });
  
  console.log(`Next weekly dashboard scheduled for: ${nextMonday.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
}

// Store daily defect snapshot for weekly dashboard
async function storeDailySnapshot(componentDefectsMap, totalDefects) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get existing snapshots
    const result = await chrome.storage.local.get(['dailySnapshots']);
    const snapshots = result.dailySnapshots || {};
    
    // Calculate breakdown by triage status
    let untriaged = 0;
    let testBugs = 0;
    let productBugs = 0;
    let infraBugs = 0;
    
    // Get all defects from all components
    const config = await getConfig();
    const componentNames = config.componentName
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    for (const componentName of componentNames) {
      const apiUrl = `https://libh-proxy1.fyre.ibm.com/buildBreakReport/rest2/defects/buildbreak/fas?fas=${encodeURIComponent(componentName)}`;
      
      try {
        const response = await fetch(apiUrl, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const allDefects = Array.isArray(data) ? data : (data.defects || []);
          
          allDefects.forEach(defect => {
            const triageTags = (defect.triageTags || defect.tags || []);
            const tagsArray = Array.isArray(triageTags) ? triageTags : [];
            
            // Check if defect has any triaged tag
            const hasTriagedTag = tagsArray.some(tag => {
              const lowerTag = tag.toLowerCase();
              return lowerTag.includes('test_bug') ||
                     lowerTag.includes('product_bug') ||
                     lowerTag.includes('infrastructure_bug') ||
                     lowerTag === 'test' ||
                     lowerTag === 'product' ||
                     lowerTag === 'infrastructure';
            });
            
            if (!hasTriagedTag) {
              // No triage tag = untriaged
              untriaged++;
            } else {
              // Has triage tag - categorize it
              const hasTestTag = tagsArray.some(tag => {
                const lowerTag = tag.toLowerCase();
                return lowerTag.includes('test_bug') || lowerTag === 'test';
              });
              const hasProductTag = tagsArray.some(tag => {
                const lowerTag = tag.toLowerCase();
                return lowerTag.includes('product_bug') || lowerTag === 'product';
              });
              const hasInfraTag = tagsArray.some(tag => {
                const lowerTag = tag.toLowerCase();
                return lowerTag.includes('infrastructure_bug') || lowerTag === 'infrastructure';
              });
              
              if (hasTestTag) {
                testBugs++;
              } else if (hasProductTag) {
                productBugs++;
              } else if (hasInfraTag) {
                infraBugs++;
              }
            }
          });
        }
      } catch (error) {
        console.error(`Error fetching defects for ${componentName}:`, error);
      }
    }
    
    // Store today's snapshot
    snapshots[today] = {
      date: today,
      total: totalDefects + testBugs + productBugs + infraBugs,
      untriaged: untriaged,
      testBugs: testBugs,
      productBugs: productBugs,
      infraBugs: infraBugs,
      componentBreakdown: componentDefectsMap.map(c => ({
        name: c.componentName,
        count: c.defects.length
      }))
    };
    
    // Keep only last 14 days of snapshots
    const dates = Object.keys(snapshots).sort();
    if (dates.length > 14) {
      const toDelete = dates.slice(0, dates.length - 14);
      toDelete.forEach(date => delete snapshots[date]);
    }
    
    // Save snapshots
    await chrome.storage.local.set({ dailySnapshots: snapshots });
    console.log(`Daily snapshot stored for ${today}`);
    
  } catch (error) {
    console.error('Error storing daily snapshot:', error);
  }
}

// Generate weekly dashboard data
async function generateWeeklyDashboard() {
  try {
    console.log('Generating weekly dashboard...');
    
    // Get last 7 days of snapshots
    const result = await chrome.storage.local.get(['dailySnapshots']);
    const snapshots = result.dailySnapshots || {};
    
    // Get dates for last 7 days
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Build daily trend data
    const dailyTrend = {
      labels: dates.map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      }),
      total: dates.map(d => snapshots[d]?.total || 0),
      untriaged: dates.map(d => snapshots[d]?.untriaged || 0)
    };
    
    // Calculate this week's totals
    const thisWeekData = dates.reduce((acc, date) => {
      const snapshot = snapshots[date] || {};
      return {
        total: acc.total + (snapshot.total || 0),
        untriaged: acc.untriaged + (snapshot.untriaged || 0),
        testBugs: acc.testBugs + (snapshot.testBugs || 0),
        productBugs: acc.productBugs + (snapshot.productBugs || 0),
        infraBugs: acc.infraBugs + (snapshot.infraBugs || 0)
      };
    }, { total: 0, untriaged: 0, testBugs: 0, productBugs: 0, infraBugs: 0 });
    
    // Calculate last week's totals for comparison
    const lastWeekDates = [];
    for (let i = 13; i >= 7; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      lastWeekDates.push(date.toISOString().split('T')[0]);
    }
    
    const lastWeekData = lastWeekDates.reduce((acc, date) => {
      const snapshot = snapshots[date] || {};
      return {
        total: acc.total + (snapshot.total || 0),
        untriaged: acc.untriaged + (snapshot.untriaged || 0)
      };
    }, { total: 0, untriaged: 0 });
    
    // Calculate trend percentage
    const trendPercentage = lastWeekData.total > 0
      ? Math.round(((thisWeekData.total - lastWeekData.total) / lastWeekData.total) * 100)
      : 0;
    
    // Get component breakdown from most recent snapshot
    const latestDate = dates[dates.length - 1];
    const latestSnapshot = snapshots[latestDate] || {};
    const componentBreakdown = latestSnapshot.componentBreakdown || [];
    
    // Build component details
    const componentDetails = componentBreakdown.map(comp => {
      // Calculate totals for this component across the week
      const weeklyData = dates.reduce((acc, date) => {
        const snapshot = snapshots[date] || {};
        const compData = (snapshot.componentBreakdown || []).find(c => c.name === comp.name);
        return acc + (compData?.count || 0);
      }, 0);
      
      return {
        name: comp.name,
        total: weeklyData,
        untriaged: comp.count,
        testBugs: 0, // Simplified for now
        productBugs: 0,
        infrastructure: 0
      };
    });
    
    // Build priority items
    const priorityItems = [];
    if (thisWeekData.untriaged > 10) {
      priorityItems.push({
        title: `High Untriaged Count`,
        description: `${thisWeekData.untriaged} untriaged defects need attention`
      });
    }
    if (trendPercentage > 20) {
      priorityItems.push({
        title: `Increasing Trend`,
        description: `Defects increased by ${trendPercentage}% from last week`
      });
    }
    
    // Build dashboard data
    const dashboardData = {
      weekStart: dates[0],
      weekEnd: dates[dates.length - 1],
      generatedAt: new Date().toISOString(),
      summary: {
        totalDefects: thisWeekData.total,
        untriaged: thisWeekData.untriaged,
        testBugs: thisWeekData.testBugs,
        productBugs: thisWeekData.productBugs,
        infraBugs: thisWeekData.infraBugs,
        trendPercentage: trendPercentage
      },
      dailyTrend: dailyTrend,
      triageBreakdown: {
        untriaged: thisWeekData.untriaged,
        testBug: thisWeekData.testBugs,
        productBug: thisWeekData.productBugs,
        infrastructure: thisWeekData.infraBugs
      },
      componentBreakdown: {
        labels: componentDetails.map(c => c.name),
        total: componentDetails.map(c => c.total),
        untriaged: componentDetails.map(c => c.untriaged)
      },
      weekComparison: {
        lastWeek: lastWeekData,
        thisWeek: thisWeekData
      },
      priorityItems: priorityItems,
      componentDetails: componentDetails
    };
    
    // Store dashboard data
    await chrome.storage.local.set({ weeklyDashboardData: dashboardData });
    console.log('Weekly dashboard data generated and stored');
    
    return dashboardData;
    
  } catch (error) {
    console.error('Error generating weekly dashboard:', error);
    throw error;
  }
}

// Send weekly dashboard notification to Slack
async function sendWeeklyDashboardNotification() {
  try {
    const config = await getConfig();
    
    if (!config.slackWebhookUrl) {
      console.error('Slack webhook URL not configured');
      return;
    }
    
    // Generate dashboard
    const dashboardData = await generateWeeklyDashboard();
    
    // Create dashboard URL (opens in Chrome tab)
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    
    // Build Slack message
    const weekStart = new Date(dashboardData.weekStart).toLocaleDateString('en-IN');
    const weekEnd = new Date(dashboardData.weekEnd).toLocaleDateString('en-IN');
    const trendIcon = dashboardData.summary.trendPercentage < 0 ? '↘️' : '↗️';
    const trendText = dashboardData.summary.trendPercentage < 0 ? 'Down' : 'Up';
    
    let message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 WEEKLY DEFECT DASHBOARD\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `Week of ${weekStart} to ${weekEnd}\n\n`;
    message += `📈 Quick Summary:\n`;
    message += `• ${dashboardData.summary.totalDefects} total defects\n`;
    message += `• ${dashboardData.summary.untriaged} untriaged (${Math.round((dashboardData.summary.untriaged / dashboardData.summary.totalDefects) * 100)}%)\n`;
    message += `• ${dashboardData.summary.testBugs} test bugs\n`;
    message += `• ${dashboardData.summary.productBugs} product bugs\n`;
    message += `• ${dashboardData.summary.infraBugs} infrastructure bugs\n`;
    message += `• Trending: ${trendIcon} ${trendText} ${Math.abs(dashboardData.summary.trendPercentage)}% from last week\n\n`;
    
    if (dashboardData.priorityItems.length > 0) {
      message += `🎯 Priority Items:\n`;
      dashboardData.priorityItems.forEach(item => {
        message += `• ${item.title}: ${item.description}\n`;
      });
      message += `\n`;
    }
    
    message += `🔗 VIEW FULL DASHBOARD\n`;
    message += `Click the extension icon and select "View Weekly Dashboard"\n`;
    message += `Or open: ${dashboardUrl}\n\n`;
    message += `The dashboard includes:\n`;
    message += `✨ Interactive charts and graphs\n`;
    message += `📊 Detailed analytics\n`;
    message += `📈 Daily trend analysis\n`;
    message += `📦 Component breakdown\n`;
    message += `📉 Week-over-week comparison\n\n`;
    message += `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    
    // Send to Slack
    const response = await fetch(config.slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });
    
    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status}`);
    }
    
    console.log('✅ Weekly dashboard notification sent to Slack');
    
    // Open dashboard in new tab
    chrome.tabs.create({ url: dashboardUrl });
    
  } catch (error) {
    console.error('❌ Error sending weekly dashboard notification:', error);
    
    // Send error notification
    try {
      const config = await getConfig();
      if (config.slackWebhookUrl) {
        await sendErrorNotification(config.slackWebhookUrl, error);
      }
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError);
    }
  }
}




