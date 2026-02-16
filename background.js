// Background service worker for defect triaging automation

// Default configuration
const DEFAULT_CONFIG = {
  ibmUsername: '',
  ibmPassword: '',
  autoLogin: true,
  slackWebhookUrl: '',
  componentName: 'Messaging',
  checkTime: '10:00', // 10:00 AM
  weeklyDashboardTime: '11:00', // 11:00 AM Monday
  enabled: true,
  paused: false, // New: pause/resume functionality
  lastCheck: null,
  lastDataCollection: null, // Track when data was last collected
  vpnConnected: false,
  retryingConnection: false // Track if we're in retry mode
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Defect Triaging Notifier installed');
  
  // Clear error notification history on extension reload
  await chrome.storage.local.remove(['lastErrorNotified', 'lastErrorMessage', 'retryingConnection']);
  console.log('🔄 Cleared error notification history - fresh notifications enabled');
  
  // Load or set default configuration
  const config = await getConfig();
  if (!config.slackWebhookUrl) {
    await chrome.storage.sync.set(DEFAULT_CONFIG);
  }
  
  // Check for missed schedules
  await checkForMissedScheduledCheck();
  
  // Set up daily alarm
  setupDailyAlarm();
  
  // Set up weekly dashboard
  console.log('Setting up weekly dashboard...');
  await setupWeeklyDashboardAlarm();
  
  console.log('✓ Extension initialized - SOE Triage and data collection will run during scheduled checks');
});

// Handle Chrome startup - check for missed scheduled checks
chrome.runtime.onStartup.addListener(async () => {
  console.log('Chrome started - checking for missed scheduled checks...');
  
  // Clear existing alarms first to prevent immediate firing
  await chrome.alarms.clearAll();
  console.log('✓ Cleared all existing alarms');
  
  // Clear any stuck flags from previous session
  await chrome.storage.local.remove(['loginInProgress', 'checkInProgress', 'dataCollectionInProgress', 'retryingConnection']);
  console.log('✓ Cleared stuck flags from previous session');
  
  // Check for missed schedules first
  await checkForMissedScheduledCheck();
  
  // Wait a bit before setting up alarms to avoid duplicate triggers
  setTimeout(async () => {
    await setupDailyAlarm();
    await setupWeeklyDashboardAlarm();
  }, 2000);
});

// Get configuration from storage
async function getConfig() {
  const result = await chrome.storage.sync.get(DEFAULT_CONFIG);
  return result;
}

// Set up daily alarm for checking defects (skips weekends)
async function setupDailyAlarm() {
  const config = await getConfig();
  
  if (!config.enabled || config.paused) {
    console.log('Automation is disabled or paused');
    return;
  }
  
  // Clear existing alarm
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
  
  // Skip weekends - move to next Monday if needed
  const dayOfWeek = nextCheck.getDay();
  if (dayOfWeek === 0) { // Sunday
    nextCheck.setDate(nextCheck.getDate() + 1); // Move to Monday
  } else if (dayOfWeek === 6) { // Saturday
    nextCheck.setDate(nextCheck.getDate() + 2); // Move to Monday
  }
  
  const delayInMinutes = (nextCheck - now) / (1000 * 60);
  
  // Create alarm
  chrome.alarms.create('dailyDefectCheck', {
    delayInMinutes: delayInMinutes,
    periodInMinutes: 24 * 60 // Repeat every 24 hours
  });
  
  console.log(`📅 Next defect check scheduled for: ${nextCheck.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
}

// Handle connection errors with retry logic
async function handleConnectionError(error) {
  const storage = await chrome.storage.local.get(['retryingConnection', 'retryAttempts', 'retryStartTime']);
  
  if (!storage.retryingConnection) {
    // First error - notify Slack
    console.error('❌ Connection error - starting retry attempts:', error.message);
    
    // Get webhook URL and send error notification
    const config = await getConfig();
    if (config.slackWebhookUrl) {
      await sendErrorNotification(config.slackWebhookUrl, error);
    }
    
    await chrome.storage.local.set({
      retryingConnection: true,
      retryAttempts: 0,
      retryStartTime: Date.now()
    });
    
    // Start retry alarm (every 30 seconds)
    await chrome.alarms.create('connectionRetry', {
      delayInMinutes: 0.5,
      periodInMinutes: 0.5
    });
    
    console.log('🔄 Retry alarm set - will retry every 30 seconds');
  } else {
    // Already retrying - just log
    const attempts = (storage.retryAttempts || 0) + 1;
    console.log(`🔄 Retry attempt ${attempts} failed, will retry in 30 seconds...`);
  }
}

// Retry connection after error
async function retryConnection() {
  try {
    const storage = await chrome.storage.local.get(['retryAttempts']);
    const attempts = (storage.retryAttempts || 0) + 1;
    
    console.log(`🔄 Connection retry attempt ${attempts}...`);
    await chrome.storage.local.set({ retryAttempts: attempts });
    
    // Try to collect all data (silent retry - no error notifications)
    await collectAllData();
    
    // Success - stop retrying
    await chrome.storage.local.set({
      retryingConnection: false,
      retryAttempts: 0
    });
    await chrome.alarms.clear('connectionRetry');
    
    console.log(`✅ Connection restored after ${attempts} attempt(s) - data collection resumed`);
  } catch (error) {
    // Still failing - will retry on next alarm (silent, no notification)
    console.log(`❌ Retry attempt failed: ${error.message} - will retry in 30 seconds...`);
  }
}

// Check for missed scheduled checks when Chrome starts
async function checkForMissedScheduledCheck() {
  try {
    const config = await getConfig();
    
    if (!config.enabled || config.paused) {
      console.log('Automation is disabled or paused - skipping missed check');
      return;
    }
    
    // Get last check time
    const lastCheck = config.lastCheck ? new Date(config.lastCheck) : null;
    const now = new Date();
    
    // Parse scheduled check time
    const [hours, minutes] = config.checkTime.split(':').map(Number);
    
    // Calculate when the check should have run today
    const scheduledTimeToday = new Date();
    scheduledTimeToday.setHours(hours, minutes, 0, 0);
    
    // Calculate when the check should have run yesterday
    const scheduledTimeYesterday = new Date(scheduledTimeToday);
    scheduledTimeYesterday.setDate(scheduledTimeYesterday.getDate() - 1);
    
    console.log(`Last check: ${lastCheck ? lastCheck.toLocaleString() : 'Never'}`);
    console.log(`Scheduled time today: ${scheduledTimeToday.toLocaleString()}`);
    console.log(`Scheduled time yesterday: ${scheduledTimeYesterday.toLocaleString()}`);
    
    // Check if we missed today's check (scheduled time has passed but no check was done)
    const missedTodayCheck = now > scheduledTimeToday &&
                            (!lastCheck || lastCheck < scheduledTimeToday);
    
    // Check if we missed yesterday's check (no check done yesterday)
    const missedYesterdayCheck = !lastCheck || lastCheck < scheduledTimeYesterday;
    
    if (missedTodayCheck) {
      console.log('⚠️ Missed today\'s scheduled check - running now with notification...');
      // Clear any login error flags to prevent duplicate checks
      await chrome.storage.local.remove(['lastLoginError', 'checkInProgress']);
      await collectAllData(false, false); // Not forced, not silent - send notification
    } else if (missedYesterdayCheck && now < scheduledTimeToday) {
      // If we haven't checked since yesterday and today's check hasn't happened yet
      // Collect data silently for dashboard trends, but don't send notification
      console.log('⚠️ Missed yesterday\'s scheduled check - collecting data silently for dashboard...');
      // Clear any login error flags to prevent duplicate checks
      await chrome.storage.local.remove(['lastLoginError', 'checkInProgress']);
      await collectAllData(false, true); // Not forced, but silent - no notification
    } else {
      console.log('✓ No missed checks detected');
    }
    
  } catch (error) {
    console.error('Error checking for missed scheduled checks:', error);
    // Send error notification to Slack
    await handleConnectionError(error);
  }
}

// Handle alarm trigger - moved to end of file with VPN check

// Send Slack notification grouped by component
async function sendSlackNotificationGrouped(webhookUrl, componentDefectsMap, totalDefects) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  
  // Check for duplicate notification suppression (within 2 minutes)
  const storage = await chrome.storage.local.get(['lastNotificationSent', 'lastNotificationCount']);
  const lastNotificationTime = storage.lastNotificationSent ? new Date(storage.lastNotificationSent) : null;
  const lastNotificationCount = storage.lastNotificationCount || 0;
  const now = new Date();
  
  // If same defect count was sent within last 2 minutes, skip
  if (lastNotificationTime &&
      lastNotificationCount === totalDefects &&
      (now - lastNotificationTime) < 2 * 60 * 1000) {
    console.log('⏭️ Skipping duplicate notification (same count within 2 minutes)');
    return;
  }
  
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
  
  // Record this notification to prevent duplicates
  await chrome.storage.local.set({
    lastNotificationSent: now.toISOString(),
    lastNotificationCount: totalDefects
  });
  
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

// Collect all data from both sources (Jazz/RTC and Build Break Report)
async function collectAllData(force = false, silent = false) {
  console.log(silent ? '📊 Starting silent data collection (no Slack notification)...' : '📊 Starting comprehensive data collection...');
  
  try {
    // Check if data collection is already in progress
    const status = await chrome.storage.local.get(['dataCollectionInProgress']);
    
    if (status.dataCollectionInProgress) {
      console.log('⚠️ Data collection already in progress, skipping duplicate request');
      return;
    }
    
    // Set flag to prevent concurrent collections
    await chrome.storage.local.set({ dataCollectionInProgress: true });
    
    // Check VPN connection first
    await checkVPNConnection();
    
    // 1. Fetch Build Break Report defects FIRST (fast - sends notification quickly)
    console.log('📋 Fetching Build Break Report defects...');
    try {
      await checkDefects(silent);
      console.log('✅ Monitored components notification sent');
    } catch (error) {
      // Check if this is a login error
      const isLoginError = error.message && error.message.includes('Not logged in');
      
      if (isLoginError) {
        console.log('🔑 Login required for Build Break Report - triggering login...');
        await chrome.storage.local.set({ needsMonitoredComponentsRetry: true });
        await attemptAutoLogin();
        
        // Wait for login to complete, then retry checkDefects
        console.log('⏳ Waiting for login to complete...');
        
        // Poll for login completion (check every second for up to 60 seconds)
        let loginCompleted = false;
        for (let i = 0; i < 60; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const loginStatus = await chrome.storage.local.get(['loginInProgress']);
          if (!loginStatus.loginInProgress) {
            loginCompleted = true;
            break;
          }
        }
        
        if (loginCompleted) {
          console.log('🔄 Retrying monitored components check after login...');
          // Clear the checkInProgress flag before retrying
          await chrome.storage.local.remove(['checkInProgress']);
          
          // Add a small delay to ensure cookies are fully propagated
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          await checkDefects(silent);
          await chrome.storage.local.remove(['needsMonitoredComponentsRetry']);
          console.log('✅ Monitored components notification sent after login');
        } else {
          console.log('⏭️ Login timeout - will retry on next scheduled check');
          throw error; // Stop here, don't proceed to SOE/51 components
        }
      } else {
        throw error; // Other errors, propagate up
      }
    }
    
    // 2. Fetch Jazz/RTC SOE Triage defects (slower)
    console.log('📋 Fetching SOE Triage defects from Jazz/RTC...');
    const soeDefects = await fetchSOETriageDefects();
    console.log(`✓ Fetched ${soeDefects ? soeDefects.length : 0} SOE Triage defects`);
    
    // 3. Collect data for all components (slowest - for component explorer)
    console.log('📋 Collecting all components data...');
    await storeAllComponentsData();
    
    // 4. Store collection timestamp
    await chrome.storage.local.set({
      lastDataCollection: Date.now(),
      dataCollectionInProgress: false
    });
    
    console.log('✅ Data collection complete at:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    
  } catch (error) {
    console.error('❌ Data collection failed:', error);
    // Clear the in-progress flag on error
    await chrome.storage.local.set({ dataCollectionInProgress: false });
    throw error;
  }
}

// Main function to check defects and send notification
async function checkDefects(silent = false) {
  try {
    // Prevent duplicate simultaneous checks
    const checkStatus = await chrome.storage.local.get(['checkInProgress']);
    if (checkStatus.checkInProgress) {
      console.log('⏭️ Check already in progress - skipping duplicate check');
      return;
    }
    
    // Set flag to indicate check is in progress
    await chrome.storage.local.set({ checkInProgress: true });
    console.log(silent ? '🔒 Silent check started - flag set' : '🔒 Check started - flag set');
    
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
    
    // Send Slack notification grouped by component (unless silent mode)
    if (!silent) {
      await sendSlackNotificationGrouped(config.slackWebhookUrl, componentDefectsMap, totalDefects);
      console.log('✅ Defect check complete - Slack notification sent');
    } else {
      console.log('✅ Silent defect check complete - data stored without notification');
    }
    
    // Update last check time
    await chrome.storage.sync.set({ lastCheck: new Date().toISOString() });
    
    // Clear the check-in-progress flag
    await chrome.storage.local.remove(['checkInProgress']);
    console.log('🔓 Check completed - flag cleared');
    
    // Data collection successful - no retry needed
    
  } catch (error) {
    // Clear the check-in-progress flag on error too
    await chrome.storage.local.remove(['checkInProgress']);
    console.log('🔓 Check failed - flag cleared');
    console.error('❌ Error checking defects:', error);
    
    // Check if this is a login error
    const isLoginError = error.message && error.message.includes('Not logged in');
    
    if (isLoginError) {
      // Login error - let collectAllData() handle the retry
      console.log('🔑 Login required - propagating error to collectAllData() for retry...');
      throw error; // Propagate to collectAllData()'s retry logic
    } else {
      // Other errors (network issues, etc.) - send to Slack with duplicate suppression
      const errorKey = error.message || 'unknown_error';
      const storage = await chrome.storage.local.get(['lastErrorNotified', 'lastErrorMessage']);
      const lastErrorMessage = storage.lastErrorMessage;
      const lastErrorTime = storage.lastErrorNotified ? new Date(storage.lastErrorNotified) : null;
      const now = new Date();
      
      console.log(`Error check - Last error: "${lastErrorMessage}", Last time: ${lastErrorTime}, Current error: "${errorKey}"`);
      
      // Only send notification if:
      // 1. First error ever (no lastErrorTime), OR
      // 2. Different error message, OR
      // 3. Same error but more than 1 hour has passed
      const shouldNotify = !lastErrorTime ||
                          lastErrorMessage !== errorKey ||
                          (now - lastErrorTime) > 60 * 60 * 1000; // 1 hour
      
      console.log(`Should notify: ${shouldNotify}`);
      
      if (error.message && error.message.includes('Failed to fetch')) {
        await chrome.storage.local.set({ lastLoginError: new Date().toISOString() });
        console.log('💾 Network error recorded - will auto-retry when connection is restored');
      }
      
      // Send error notification to Slack (but only once per hour for same error)
      if (shouldNotify) {
        try {
          const config = await getConfig();
          if (config.slackWebhookUrl) {
            await sendErrorNotification(config.slackWebhookUrl, error);
            // Record that we sent this notification
            await chrome.storage.local.set({
              lastErrorNotified: now.toISOString(),
              lastErrorMessage: errorKey
            });
            console.log('📧 Error notification sent to Slack');
          } else {
            console.log('⚠️ No Slack webhook configured - cannot send error notification');
          }
        } catch (notificationError) {
          console.error('Failed to send error notification:', notificationError);
        }
      } else {
        console.log('⏭️ Skipping duplicate error notification (same error within 1 hour)');
      }
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
    // Collect all data (Jazz + Build Break Report) and send both notifications
    // Use force=true to bypass duplicate check for demos/testing
    collectAllData(true)
      .then(() => {
        // Wait a moment for data to be stored
        return new Promise(resolve => setTimeout(resolve, 1500));
      })
      .then(() => {
        // Send weekly dashboard with fresh data
        return sendWeeklyDashboardNotification();
      })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'updateSchedule') {
    Promise.all([
      setupDailyAlarm(),
      setupWeeklyDashboardAlarm()
    ]).then(() => {
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
  
  if (request.action === 'fetchSOETriageDefects') {
    console.log('🔍 Manual SOE Triage fetch triggered from options page');
    fetchSOETriageDefects().then(async (defects) => {
      const result = await chrome.storage.local.get(['soeTriageLastFetch']);
      sendResponse({
        success: true,
        defects: defects,
        lastFetch: result.soeTriageLastFetch
      });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'fetchAllComponentsData') {
    console.log('📊 Manual all components data fetch triggered');
    storeAllComponentsData().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'pauseExtension') {
    chrome.alarms.clearAll().then(async () => {
      // Update lastCheck to now so we don't run missed checks when resumed
      await chrome.storage.sync.set({
        paused: true,
        lastCheck: new Date().toISOString()
      });
      console.log('⏸️ Extension paused - all alarms cleared, lastCheck updated');
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'resumeExtension') {
    chrome.storage.sync.set({
      paused: false,
      lastCheck: new Date().toISOString() // Update lastCheck to now when resuming
    }).then(async () => {
      await setupDailyAlarm();
      await setupWeeklyDashboardAlarm();
      console.log('▶️ Extension resumed - alarms restarted, lastCheck updated');
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'testAutoLogin') {
    console.log('🧪 Manual auto-login test triggered from popup');
    attemptAutoLogin().then(() => {
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
  
  // Parse the configured time (format: "HH:MM")
  const [hours, minutes] = (config.weeklyDashboardTime || '11:00').split(':').map(Number);
  
  // Calculate next Monday at configured time IST
  const now = new Date();
  const nextMonday = new Date();
  
  // Set to configured time
  nextMonday.setHours(hours, minutes, 0, 0);
  
  // Find next Monday (day 1)
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  let daysUntilMonday;
  
  if (currentDay === 0) {
    // Sunday - next Monday is tomorrow
    daysUntilMonday = 1;
  } else if (currentDay === 1) {
    // Monday - check if time has passed
    if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) {
      // Time has passed, schedule for next Monday
      daysUntilMonday = 7;
    } else {
      // Time hasn't passed yet, schedule for today
      daysUntilMonday = 0;
    }
  } else {
    // Tuesday to Saturday - calculate days until next Monday
    daysUntilMonday = (8 - currentDay) % 7;
  }
  
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  
  const delayInMinutes = (nextMonday - now) / (1000 * 60);
  
  // Create alarm for Monday at configured time, repeat weekly
  chrome.alarms.create('weeklyDashboard', {
    delayInMinutes: delayInMinutes,
    periodInMinutes: 7 * 24 * 60 // Repeat every 7 days
  });
  
  console.log(`📅 Next weekly dashboard scheduled for: ${nextMonday.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (${config.weeklyDashboardTime || '11:00'})`);
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
      componentBreakdown: await Promise.all(componentNames.map(async (componentName) => {
        const apiUrl = `https://libh-proxy1.fyre.ibm.com/buildBreakReport/rest2/defects/buildbreak/fas?fas=${encodeURIComponent(componentName)}`;
        
        try {
          const response = await fetch(apiUrl, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            const allDefects = Array.isArray(data) ? data : (data.defects || []);
            
            let compUntriaged = 0;
            let compTestBugs = 0;
            let compProductBugs = 0;
            let compInfraBugs = 0;
            
            allDefects.forEach(defect => {
              const triageTags = (defect.triageTags || defect.tags || []);
              const tagsArray = Array.isArray(triageTags) ? triageTags : [];
              
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
                compUntriaged++;
              } else {
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
                  compTestBugs++;
                } else if (hasProductTag) {
                  compProductBugs++;
                } else if (hasInfraTag) {
                  compInfraBugs++;
                }
              }
            });
            
            return {
              name: componentName,
              total: allDefects.length,
              untriaged: compUntriaged,
              testBugs: compTestBugs,
              productBugs: compProductBugs,
              infraBugs: compInfraBugs
            };
          }
        } catch (error) {
          console.error(`Error fetching component breakdown for ${componentName}:`, error);
        }
        
        return {
          name: componentName,
          total: 0,
          untriaged: 0,
          testBugs: 0,
          productBugs: 0,
          infraBugs: 0
        };
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
// Store data for ALL components (for component explorer feature)
async function storeAllComponentsData() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // List of ALL available components
    const allComponents = [
      'AdminCenter', 'App Client', 'Async Scheduling (Persistent Executor, CommonJ)',
      'Batch', 'Bean Validation', 'Build', 'CDI', 'Classloading',
      'Cloud/Virtualization', 'Core Security', 'Database (jdbc, oracle, db2, derby)',
      'Docs', 'Dynacache', 'EE / MP Concurrency', 'EJB Container', 'IIOP/ORB',
      'IBM i', 'Install', 'InstantOn', 'Intelligent Management', 'JAX-RS',
      'Jakarta Data', 'Java EE Platform', 'JCA', 'JPA', 'JSON',
      'Kernel/Bootstrap', 'MCP', 'Messaging', 'MicroProfile Core (config, fault tolerance, reactive)',
      'MicroProfile GraphQL', 'MicroProfile Observability (metrics, open tracing, health)',
      'MicroProfile Open API', 'MicroProfile REST Client', 'Mongo', 'OSGi Applications',
      'Observability', 'Real-Time Comm (WebRTC, SIP)', 'Repository', 'Security SSO (jwt, oauth, oidc, social, mpjwt, saml)',
      'Spring Boot', 'Systems Management', 'Transactions', 'Transport (cfw, http, ssl, websockets)',
      'Usage Metering', 'WAS on Cloud', 'Web Comps (servlet, httpsession, jsp, jsf, etc)',
      'Web Services', 'Web Services Security', 'WebSphere Automation', 'z/OS'
    ];
    
    // Get existing all components data
    const result = await chrome.storage.local.get(['allComponentsSnapshots']);
    const allSnapshots = result.allComponentsSnapshots || {};
    
    // Initialize today's snapshot if not exists
    if (!allSnapshots[today]) {
      allSnapshots[today] = {};
    }
    
    console.log(`📊 Collecting data for ${allComponents.length} components...`);
    
    // Fetch data for each component
    for (const componentName of allComponents) {
      const apiUrl = `https://libh-proxy1.fyre.ibm.com/buildBreakReport/rest2/defects/buildbreak/fas?fas=${encodeURIComponent(componentName)}`;
      
      try {
        const response = await fetch(apiUrl, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const allDefects = Array.isArray(data) ? data : (data.defects || []);
          
          let untriaged = 0;
          let testBugs = 0;
          let productBugs = 0;
          let infraBugs = 0;
          
          allDefects.forEach(defect => {
            const triageTags = (defect.triageTags || defect.tags || []);
            const tagsArray = Array.isArray(triageTags) ? triageTags : [];
            
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
              untriaged++;
            } else {
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
          
          // Store component data
          allSnapshots[today][componentName] = {
            total: allDefects.length,
            untriaged: untriaged,
            testBugs: testBugs,
            productBugs: productBugs,
            infraBugs: infraBugs
          };
          
          console.log(`✓ ${componentName}: ${allDefects.length} defects`);
        }
      } catch (error) {
        console.error(`Error fetching ${componentName}:`, error);
        // Store empty data on error
        allSnapshots[today][componentName] = {
          total: 0,
          untriaged: 0,
          testBugs: 0,
          productBugs: 0,
          infraBugs: 0
        };
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Keep only last 14 days of snapshots
    const dates = Object.keys(allSnapshots).sort();
    if (dates.length > 14) {
      const toDelete = dates.slice(0, dates.length - 14);
      toDelete.forEach(date => delete allSnapshots[date]);
    }
    
    // Save all components snapshots
    await chrome.storage.local.set({ allComponentsSnapshots: allSnapshots });
    console.log(`✅ All components data stored for ${today}`);
    
  } catch (error) {
    console.error('Error storing all components data:', error);
  }
}


// Generate weekly dashboard data
async function generateWeeklyDashboard() {
  try {
    // Check if dashboard generation is already in progress
    const status = await chrome.storage.local.get(['dashboardGenerationInProgress', 'lastDashboardGeneration']);
    
    if (status.dashboardGenerationInProgress) {
      console.log('⚠️ Dashboard generation already in progress, skipping duplicate request');
      return;
    }
    
    // Check if dashboard was generated recently (within last 1 minute)
    if (status.lastDashboardGeneration) {
      const timeSinceLastGeneration = Date.now() - status.lastDashboardGeneration;
      if (timeSinceLastGeneration < 60 * 1000) { // 1 minute
        console.log(`⚠️ Dashboard was generated ${Math.round(timeSinceLastGeneration / 1000)}s ago, skipping duplicate`);
        return;
      }
    }
    
    // Set flag to prevent concurrent generations
    await chrome.storage.local.set({ dashboardGenerationInProgress: true });
    
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
    
    // Get the latest (most recent) snapshot data for current counts
    const latestDate = dates[dates.length - 1];
    const latestSnapshot = snapshots[latestDate] || {};
    
    const thisWeekData = {
      total: latestSnapshot.total || 0,
      untriaged: latestSnapshot.untriaged || 0,
      testBugs: latestSnapshot.testBugs || 0,
      productBugs: latestSnapshot.productBugs || 0,
      infraBugs: latestSnapshot.infraBugs || 0
    };
    
    // Get last week's data for comparison (7 days ago)
    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekDateStr = lastWeekDate.toISOString().split('T')[0];
    const lastWeekSnapshot = snapshots[lastWeekDateStr] || {};
    
    const lastWeekData = {
      total: lastWeekSnapshot.total || 0,
      untriaged: lastWeekSnapshot.untriaged || 0
    };
    
    // Calculate trend percentage
    const trendPercentage = lastWeekData.total > 0
      ? Math.round(((thisWeekData.total - lastWeekData.total) / lastWeekData.total) * 100)
      : 0;
    
    // Get component breakdown from most recent snapshot (already defined above)
    const componentBreakdown = latestSnapshot.componentBreakdown || [];
    
    // Component details are already in the breakdown with full data
    const componentDetails = componentBreakdown;
    
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
        untriaged: componentDetails.map(c => c.untriaged),
        testBugs: componentDetails.map(c => c.testBugs),
        productBugs: componentDetails.map(c => c.productBugs),
        infraBugs: componentDetails.map(c => c.infraBugs)
      },
      weekComparison: {
        lastWeek: lastWeekData,
        thisWeek: thisWeekData
      },
      priorityItems: priorityItems,
      componentDetails: componentDetails
    };
    
    // Store dashboard data and clear the in-progress flag
    await chrome.storage.local.set({
      weeklyDashboardData: dashboardData,
      lastDashboardGeneration: Date.now(),
      dashboardGenerationInProgress: false
    });
    console.log('Weekly dashboard data generated and stored');
    
    return dashboardData;
    
  } catch (error) {
    console.error('Error generating weekly dashboard:', error);
    // Clear the in-progress flag on error
    await chrome.storage.local.set({ dashboardGenerationInProgress: false });
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
    message += `Or copy and paste this URL in Chrome: ${dashboardUrl}\n\n`;
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
    console.log('📊 Dashboard link included in Slack message - user can click to view');
    
    // Don't auto-open dashboard - user will click link in Slack when they want to view it
    
  } catch (error) {
    console.error('❌ Error sending weekly dashboard notification:', error);
    
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






// ============================================
// JAZZ/RTC SOE TRIAGE INTEGRATION
// ============================================

// Check if authenticated with Jazz/RTC by trying the actual API
async function isAuthenticatedWithJazzRTC() {
  try {
    // Try to access the actual query API to check authentication
    const jazzBaseUrl = 'https://wasrtc.hursley.ibm.com:9443/jazz';
    const queryId = '_fJ834OXIEemRB5enIPF1MQ';
    const queryUrl = `${jazzBaseUrl}/oslc/queries/${queryId}/rtc_cm:results?oslc.select=*,rtc_cm:filedAgainst{dcterms:title}`;
    
    const response = await fetch(queryUrl, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'OSLC-Core-Version': '2.0'
      },
      cache: 'no-cache'
    });
    
    // Check if we got JSON response (authenticated) or HTML (not authenticated)
    const contentType = response.headers.get('content-type');
    const isAuthenticated = response.ok && contentType && contentType.includes('application/json');
    
    console.log(`Jazz/RTC auth check: status=${response.status}, contentType=${contentType}, authenticated=${isAuthenticated}`);
    
    return isAuthenticated;
  } catch (error) {
    console.log('Could not check Jazz/RTC authentication status:', error.message);
    return false;
  }
}

// Open Jazz/RTC login page and auto-fill credentials
async function openJazzRTCLoginPage() {
  try {
    console.log('🔑 Opening Jazz/RTC login page for authentication...');
    
    const config = await getConfig();
    
    if (!config.ibmUsername || !config.ibmPassword) {
      console.log('⚠️ IBM credentials not configured');
      chrome.notifications.create('jazz-config-required', {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        title: '⚙️ Configuration Required',
        message: 'Please configure your IBM credentials in the extension options.',
        priority: 2,
        requireInteraction: true
      });
      return;
    }
    
    // Open the Jazz/RTC login page
    const jazzUrl = 'https://wasrtc.hursley.ibm.com:9443/jazz/authenticated/identity';
    
    const tab = await chrome.tabs.create({
      url: jazzUrl,
      active: false // Open in background initially
    });
    
    console.log(`✓ Jazz/RTC login tab created: ID=${tab.id}`);
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Inject script to auto-fill and submit credentials
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (username, password) => {
          // Find username and password fields
          const usernameField = document.querySelector('input[name="j_username"]') ||
                               document.querySelector('input[type="text"]') ||
                               document.querySelector('#username');
          
          const passwordField = document.querySelector('input[name="j_password"]') ||
                               document.querySelector('input[type="password"]') ||
                               document.querySelector('#password');
          
          const submitButton = document.querySelector('input[type="submit"]') ||
                              document.querySelector('button[type="submit"]') ||
                              document.querySelector('button');
          
          if (usernameField && passwordField) {
            console.log('✓ Found login form fields');
            usernameField.value = username;
            passwordField.value = password;
            
            if (submitButton) {
              console.log('✓ Submitting login form');
              submitButton.click();
            } else {
              // Try to submit the form directly
              const form = usernameField.closest('form');
              if (form) {
                form.submit();
              }
            }
          } else {
            console.log('⚠️ Could not find login form fields');
          }
        },
        args: [config.ibmUsername, config.ibmPassword]
      });
      
      console.log('✓ Credentials auto-filled and submitted');
      
      // Wait for login to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Close the tab after successful login
      await chrome.tabs.remove(tab.id);
      console.log('✓ Login tab closed');
      
      // Show success notification
      chrome.notifications.create('jazz-login-success', {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        title: '✅ Jazz/RTC Login Successful',
        message: 'You are now logged in to Jazz/RTC. Fetching SOE Triage defects...',
        priority: 1
      });
      
      // Trigger SOE Triage fetch after successful login
      setTimeout(() => {
        fetchSOETriageDefects().catch(error => {
          console.error('Error fetching SOE Triage defects after login:', error);
        });
      }, 1000);
      
    } catch (scriptError) {
      console.error('Error injecting login script:', scriptError);
      
      // If auto-fill fails, show the tab so user can login manually
      await chrome.tabs.update(tab.id, { active: true });
      
      chrome.notifications.create('jazz-manual-login', {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        title: '🔐 Manual Login Required',
        message: 'Please log in to Jazz/RTC manually with your IBM credentials.',
        priority: 2,
        requireInteraction: true
      });
    }
    
  } catch (error) {
    console.error('Error opening Jazz/RTC login page:', error);
  }
}

// Fetch SOE Triage overdue defects from Jazz/RTC
async function fetchSOETriageDefects() {
  try {
    console.log('Fetching SOE Triage overdue defects from Jazz/RTC...');
    
    // Check if we're authenticated with Jazz/RTC
    const isAuthenticated = await isAuthenticatedWithJazzRTC();
    if (!isAuthenticated) {
      console.log('🔑 Jazz/RTC authentication required - opening login page...');
      await openJazzRTCLoginPage();
      // Don't throw error - auto-login will trigger fetch automatically
      return [];
    }
    
    const config = await getConfig();
    const componentNames = config.componentName
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    // Jazz/RTC saved query URL
    // Query ID: _fJ834OXIEemRB5enIPF1MQ (SOE Triage: Overdue Defects)
    const jazzBaseUrl = 'https://wasrtc.hursley.ibm.com:9443/jazz';
    const projectArea = 'WS-CD';
    const queryId = '_fJ834OXIEemRB5enIPF1MQ';
    
    // Use OSLC Query API to fetch work items with inline properties
    // Use oslc.select to get nested properties inline
    const queryUrl = `${jazzBaseUrl}/oslc/queries/${queryId}/rtc_cm:results?oslc.select=*,rtc_cm:filedAgainst{dcterms:title}`;
    
    console.log(`Fetching from: ${queryUrl}`);
    
    const response = await fetch(queryUrl, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'OSLC-Core-Version': '2.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Jazz/RTC API request failed: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Jazz/RTC returned non-JSON response - authentication may have failed');
    }
    
    const data = await response.json();
    console.log('Jazz/RTC response received:', data);
    console.log('Jazz/RTC response keys:', Object.keys(data));
    console.log('Jazz/RTC response type:', typeof data);
    
    // Parse work items from response
    const workItems = await parseJazzWorkItems(data, componentNames);
    console.log('Parsed work items:', workItems);
    
    console.log(`Found ${workItems.length} SOE Triage overdue defects`);
    
    // Store in chrome.storage for dashboard
    await chrome.storage.local.set({ 
      soeTriageDefects: workItems,
      soeTriageLastFetch: new Date().toISOString()
    });
    
    return workItems;
    
  } catch (error) {
    console.error('Error fetching SOE Triage defects:', error);
    throw error;
  }
}

// Parse Jazz/RTC work items from API response
async function parseJazzWorkItems(data, componentNames) {
  const workItems = [];
  
  try {
    // Jazz/RTC OSLC response structure
    let results = [];
    
    if (data['oslc:results']) {
      results = data['oslc:results'];
    } else if (data.results) {
      results = data.results;
    } else if (Array.isArray(data)) {
      results = data;
    }
    
    console.log('Results array length:', results.length);
    console.log('First result sample:', results[0]);
    console.log('First result keys:', results[0] ? Object.keys(results[0]) : []);
    
    // First pass: collect all functional area URLs that need to be resolved
    const functionalAreaUrls = new Set();
    for (const item of results) {
      const functionalAreaRaw = item['rtc_ext:functional_area'];
      if (functionalAreaRaw && typeof functionalAreaRaw === 'object' && functionalAreaRaw['rdf:resource']) {
        functionalAreaUrls.add(functionalAreaRaw['rdf:resource']);
      }
    }
    
    // Fetch all functional area labels
    console.log(`Resolving ${functionalAreaUrls.size} functional area URLs...`);
    const functionalAreaMap = {};
    for (const url of functionalAreaUrls) {
      try {
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // The label is in dc:title (Dublin Core title)
          const label = data['dc:title'] || data['dcterms:title'] || data['rdfs:label'] || data['oslc:label'] || data.title || data.label || data.name || 'Unknown';
          functionalAreaMap[url] = label;
          console.log(`✓ Resolved: ${label}`);
        } else {
          console.warn(`Failed to resolve ${url}: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error resolving ${url}:`, error);
      }
    }
    
    // Second pass: process all work items with resolved functional areas
    for (const item of results) {
      const id = item['dcterms:identifier'] || item.identifier || item.id || 'N/A';
      const summary = item['dcterms:title'] || item.title || item.summary || 'N/A';
      const description = item['dcterms:description'] || item.description || '';
      
      // Functional Area - resolve from rdf:resource URL
      let functionalArea = 'N/A';
      const functionalAreaRaw = item['rtc_ext:functional_area'];
      if (functionalAreaRaw) {
        if (typeof functionalAreaRaw === 'object' && functionalAreaRaw['rdf:resource']) {
          // Look up the resolved label
          functionalArea = functionalAreaMap[functionalAreaRaw['rdf:resource']] || 'N/A';
        } else if (typeof functionalAreaRaw === 'string') {
          functionalArea = functionalAreaRaw;
        }
      }
      
      // Filed Against (category/component) - can be object or string
      // With oslc.select, this should now have dcterms:title inline
      let filedAgainstRaw = item['rtc_cm:filedAgainst'] ||
                            item.filedAgainst ||
                            item.category;
      const filedAgainst = typeof filedAgainstRaw === 'object' ?
        (filedAgainstRaw['dcterms:title'] || filedAgainstRaw.title || filedAgainstRaw.name || filedAgainstRaw.label || 'N/A') :
        (filedAgainstRaw || 'N/A');
      
      // Creation Date
      const creationDate = item['dcterms:created'] || item.created || item.creationDate;
      const formattedDate = creationDate ?
        new Date(creationDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) : 'N/A';
      
      // Owner - can be object or string
      let ownerRaw = item['rtc_cm:ownedBy'] ||
                     item.ownedBy ||
                     item.owner ||
                     item['dcterms:creator'];
      const ownedBy = typeof ownerRaw === 'object' ?
        (ownerRaw.title || ownerRaw.name || ownerRaw.label || 'Unassigned') :
        (ownerRaw || 'Unassigned');
      
      // Include ALL SOE Triage defects (not filtered by monitored components)
      // These are critical overdue defects that should always be visible
      console.log(`Defect ${id}: functionalArea="${functionalArea}", filedAgainst="${filedAgainst}"`);
      
      workItems.push({
        id: id,
        summary: summary,
        functionalArea: functionalArea,
        filedAgainst: filedAgainst,
        creationDate: formattedDate,
        ownedBy: ownedBy,
        description: description
      });
    }
    
  } catch (error) {
    console.error('Error parsing Jazz work items:', error);
  }
  
  return workItems;
}

// Set up periodic fetch of SOE Triage defects
async function setupSOETriageFetch() {
  // Clear existing alarm
  await chrome.alarms.clear('soeTriageFetch');
  
  // Create alarm to fetch SOE Triage defects every 2 hours
  chrome.alarms.create('soeTriageFetch', {
    delayInMinutes: 1, // Start after 1 minute
    periodInMinutes: 120 // Repeat every 2 hours
  });
  
  console.log('SOE Triage fetch scheduled - will run every 2 hours');
}


// ============================================
// VPN DETECTION AND AUTO-LOGIN FUNCTIONALITY
// ============================================

// Check if VPN/network is accessible (called only when needed)
async function checkVPNConnection() {
  try {
    const response = await fetch('https://libh-proxy1.fyre.ibm.com/buildBreakReport/', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    // If we can reach the server, connection is good
    return response.status !== 0;
  } catch (error) {
    // If fetch fails, VPN/network is not accessible
    throw new Error('VPN or network connection not available');
  }
}

// Attempt automatic login to IBM w3id
async function attemptAutoLogin() {
  try {
    // Check if login is already in progress
    const storage = await chrome.storage.local.get(['loginInProgress']);
    if (storage.loginInProgress) {
      console.log('⏭️ Login already in progress, skipping...');
      return;
    }
    
    // Mark login as in progress
    await chrome.storage.local.set({ loginInProgress: true });
    
    console.log('🔐 Attempting automatic login...');
    console.log('📍 Current time:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    
    const config = await getConfig();
    
    if (!config.ibmUsername || !config.ibmPassword) {
      console.log('⚠️ IBM credentials not configured');
      console.log('   Please configure credentials in the extension options');
      
      // Show notification to configure credentials
      chrome.notifications.create('config-required', {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        title: '⚙️ Configuration Required',
        message: 'Please configure your IBM credentials in the extension options.',
        priority: 2,
        requireInteraction: true
      });
      return;
    }
    
    console.log('✓ Credentials configured, checking login status...');
    
    // Check if already logged in
    let alreadyLoggedIn = false;
    try {
      const testResponse = await fetch('https://libh-proxy1.fyre.ibm.com/buildBreakReport/rest2/defects/buildbreak/fas?fas=Messaging', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      
      const contentType = testResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        alreadyLoggedIn = true;
        console.log('✓ Already logged in to IBM system');
      }
    } catch (error) {
      console.log('Could not check login status, will open login page:', error.message);
    }
    
    // If already logged in, just notify user
    if (alreadyLoggedIn) {
      console.log('✓ You are already logged in. No need to authenticate again.');
      await chrome.storage.local.remove(['loginInProgress']);
      return;
    }
    
    // Not logged in, need to authenticate
    console.log('🔑 Not logged in, opening login page...');
    console.log('   Creating new tab for login...');
    
    // Open the IBM page in a new tab in the BACKGROUND first
    // If it auto-logs in, user won't see it. If manual login needed, we'll show it.
    const tab = await chrome.tabs.create({
      url: 'https://libh-proxy1.fyre.ibm.com/buildBreakReport/',
      active: false // Open in background initially
    });
    
    console.log(`✓ Login tab created: ID=${tab.id}, WindowID=${tab.windowId}`);
    
    // Store the tab and window IDs for notification click handler
    await chrome.storage.local.set({
      loginTabId: tab.id,
      loginWindowId: tab.windowId,
      loginTabNeedsAttention: false // Will be set to true if manual login needed
    });
    
    console.log(`✓ Login page opened in background tab ${tab.id}`);
    console.log('   Waiting to see if manual login is required...');
    console.log('   Monitoring tab for authentication flow...');
    
    // Still monitor for successful login, but don't try to automate the click
    await handleW3IDAuthentication(tab.id, config.ibmUsername, config.ibmPassword);
    
  } catch (error) {
    console.error('❌ Auto-login error:', error);
    console.error('   Error stack:', error.stack);
    
    // Clear login in progress flag
    await chrome.storage.local.remove(['loginInProgress']);
    
    // Show error notification
    chrome.notifications.create('login-error', {
      type: 'basic',
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      title: '❌ Login Error',
      message: `Failed to open login page: ${error.message}`,
      priority: 2,
      requireInteraction: true
    });
  }
}

// Handle w3id authentication flow
async function handleW3IDAuthentication(tabId, username, password) {
  return new Promise((resolve, reject) => {
    let authAttempted = false;
    
    // Listen for tab updates
    const listener = async (updatedTabId, changeInfo, tab) => {
      if (updatedTabId !== tabId) return;
      
      // Check if we're on the w3id login page
      if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab loaded:', tab.url);
        
        // If we're on the w3id authentication page - manual login needed
        if (tab.url.includes('login.w3.ibm.com') || tab.url.includes('w3id')) {
          if (!authAttempted) {
            authAttempted = true;
            console.log('🔐 Detected w3id login page - manual login required');
            
            // Show notification and bring tab to foreground since manual login is needed
            chrome.notifications.create('ibm-login-alert', {
              type: 'basic',
              iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              title: '🔐 IBM Login Required',
              message: 'Please switch to Chrome and click "Sign in" in the passkey dialog.',
              priority: 2,
              requireInteraction: true,
              silent: false
            }, (notificationId) => {
              if (chrome.runtime.lastError) {
                console.log('⚠️ Notification error:', chrome.runtime.lastError.message);
              } else {
                console.log('✓ Notification created - manual login needed');
              }
            });
            
            // Bring tab to foreground and focus window
            try {
              await chrome.tabs.update(tabId, { active: true });
              const tabInfo = await chrome.tabs.get(tabId);
              await chrome.windows.update(tabInfo.windowId, {
                focused: true,
                drawAttention: true,
                state: 'normal'
              });
              console.log('✓ Tab brought to foreground for manual login');
            } catch (error) {
              console.log('⚠️ Could not bring tab to foreground:', error.message);
            }
            
            // Inject script to fill in credentials and submit
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: fillW3IDCredentials,
                args: [username, password]
              });
              
              console.log('✓ Credentials filled, waiting for authentication...');
            } catch (error) {
              console.error('Error injecting script:', error);
              chrome.tabs.onUpdated.removeListener(listener);
              reject(error);
            }
          }
        }
        
        // If we successfully reached the build break report page without needing login
        if (tab.url.includes('libh-proxy1.fyre.ibm.com/buildBreakReport') &&
            !tab.url.includes('login')) {
          
          if (!authAttempted) {
            // Auto-logged in! Close tab
            console.log('✓ Auto-logged in successfully (already authenticated in browser)');
            console.log('   Session cookies are now available for next scheduled check');
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(async () => {
              chrome.tabs.remove(tabId);
              // Clear login in progress flag only
              await chrome.storage.local.remove(['loginInProgress']);
              console.log('✓ Login complete - cookies ready for next check');
            }, 2000);
            resolve();
          } else {
            // Logged in after manual authentication
            console.log('✓ Successfully logged in to IBM system after manual authentication!');
            console.log('   Session cookies are now available for next scheduled check');
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(async () => {
              chrome.tabs.remove(tabId);
              // Clear login in progress flag only
              await chrome.storage.local.remove(['loginInProgress']);
              console.log('✓ Login complete - cookies ready for next check');
            }, 2000);
            resolve();
          }
        }
      }
    };
    
    chrome.tabs.onUpdated.addListener(listener);
    
    // Timeout after 60 seconds
    setTimeout(async () => {
      chrome.tabs.onUpdated.removeListener(listener);
      console.log('⚠️ Auto-login timeout - please login manually');
      // Clear login in progress flag on timeout
      await chrome.storage.local.remove(['loginInProgress']);
      resolve(); // Don't reject, just resolve
    }, 60000);
  });
}

// Function to be injected into the w3id login page
function fillW3IDCredentials(username, password) {
  console.log('Filling w3id credentials...');
  
  // Check if we're on the sign-in method selection page
  const checkForSignInMethodPage = () => {
    const pageText = document.body.innerText;
    
    // Check if this is the "Choose a Single-Sign On method" page
    if (pageText.includes('Choose a Single-Sign On method') ||
        pageText.includes('Sign in with w3id')) {
      console.log('✓ Detected sign-in method selection page');
      console.log('Looking for Passkey option...');
      
      // Strategy 1: Look for clickable elements with arrow icon (→)
      const allClickable = Array.from(document.querySelectorAll('a, button, [role="button"], div[onclick], div[class*="click"]'));
      console.log(`Found ${allClickable.length} potentially clickable elements`);
      
      allClickable.forEach((el, idx) => {
        const text = el.textContent.trim().substring(0, 50);
        console.log(`Element ${idx}: tag=${el.tagName}, text="${text}"`);
      });
      
      // Find element containing "Passkey"
      const passkeyElement = allClickable.find(el => {
        const text = el.textContent;
        return text.includes('Passkey') || text.includes('passkey');
      });
      
      if (passkeyElement) {
        console.log('✓ Found Passkey element, clicking...');
        console.log(`  Tag: ${passkeyElement.tagName}, Text: ${passkeyElement.textContent.substring(0, 100)}`);
        passkeyElement.click();
        
        // Also try triggering mouse events
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        passkeyElement.dispatchEvent(clickEvent);
        
        return true;
      }
      
      // Strategy 2: Look for the first option (Passkey is usually first)
      const firstOption = document.querySelector('div[class*="option"], li[class*="option"], a[class*="method"]');
      if (firstOption && firstOption.textContent.toLowerCase().includes('passkey')) {
        console.log('✓ Found Passkey as first option, clicking...');
        firstOption.click();
        return true;
      }
      
      console.log('⚠️ Could not find Passkey option to click');
      console.log('Page HTML structure:', document.body.innerHTML.substring(0, 500));
    }
    
    // Check if we're on the passkey dialog page (after clicking Passkey option)
    if (pageText.includes('Sign-in with Your Passkey') ||
        pageText.includes('Sign in with a passkey') ||
        pageText.includes('w3id on IBM Verify')) {
      console.log('✓ Detected passkey authentication dialog');
      console.log('⚠️ User needs to manually click "Sign in" button in the passkey dialog');
      // Don't try to automate this - let user click manually
      return false;
    }
    
    return false;
  };
  
  // Wait for page to be fully loaded
  const fillCredentials = () => {
    // First check if we're on the sign-in method selection page
    if (checkForSignInMethodPage()) {
      console.log('Clicked on Passkey option, waiting for passkey dialog...');
      setTimeout(fillCredentials, 2000);
      return true;
    }
    
    // Try to find username field
    const usernameField = document.querySelector('input[type="email"]') ||
                         document.querySelector('input[name="username"]') ||
                         document.querySelector('input[id*="username"]') ||
                         document.querySelector('input[placeholder*="email"]');
    
    // Try to find password field
    const passwordField = document.querySelector('input[type="password"]');
    
    if (usernameField && passwordField) {
      console.log('Found credential fields, filling...');
      
      // Fill username
      usernameField.value = username;
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      usernameField.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Fill password
      passwordField.value = password;
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      passwordField.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('Credentials filled, looking for submit button...');
      
      // Find and click submit button
      setTimeout(() => {
        const submitButton = document.querySelector('button[type="submit"]') ||
                           document.querySelector('input[type="submit"]') ||
                           document.querySelector('button[id*="submit"]') ||
                           document.querySelector('button[id*="login"]') ||
                           document.querySelector('button[class*="submit"]');
        
        if (submitButton) {
          console.log('Clicking submit button...');
          submitButton.click();
        } else {
          console.log('Submit button not found, trying form submit...');
          const form = document.querySelector('form');
          if (form) {
            form.submit();
          }
        }
      }, 500);
      
      return true;
    } else {
      console.log('Credential fields not found yet, retrying...');
      return false;
    }
  };
  
  // Try immediately
  if (!fillCredentials()) {
    // If not found, wait and try again
    setTimeout(fillCredentials, 1000);
    setTimeout(fillCredentials, 2000);
    setTimeout(fillCredentials, 3000);
    setTimeout(fillCredentials, 4000);
  }
}

// Alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyDefectCheck') {
    // Check if today is weekend
    const today = new Date().getDay();
    if (today === 0 || today === 6) {
      console.log('⏭️ Skipping weekend - no check today');
      return;
    }
    
    console.log('📅 Daily defect check triggered');
    try {
      // Collect all data (includes monitored components notification, SOE Triage, and all 51 components)
      // Flow: 1) Check monitored components + send notification, 2) Fetch SOE Triage, 3) Collect all 51 components
      await collectAllData();
      
      console.log('✅ Daily check complete - data collected and notifications sent');
    } catch (error) {
      console.error('Daily check failed:', error);
      await handleConnectionError(error);
    }
  } else if (alarm.name === 'weeklyDashboard') {
    console.log('📊 Weekly dashboard triggered');
    try {
      await sendWeeklyDashboardNotification();
    } catch (error) {
      console.error('Weekly dashboard failed:', error);
    }
  } else if (alarm.name === 'connectionRetry') {
    console.log('🔄 Connection retry triggered');
    await retryConnection();
  }
});

// Handle notification clicks - bring Chrome window to foreground
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId === 'ibm-login-alert') {
    console.log('Notification clicked, focusing Chrome window...');
    
    // Get the stored tab and window IDs
    const storage = await chrome.storage.local.get(['loginTabId', 'loginWindowId']);
    
    if (storage.loginWindowId && storage.loginTabId) {
      try {
        // Focus the window
        await chrome.windows.update(storage.loginWindowId, {
          focused: true,
          state: 'normal'
        });
        
        // Activate the tab
        await chrome.tabs.update(storage.loginTabId, {
          active: true
        });
        
        console.log('✓ Chrome window and tab focused');
      } catch (error) {
        console.log('⚠️ Could not focus window:', error.message);
      }
    }
    
    // Clear the notification
    chrome.notifications.clear(notificationId);
  }
});
