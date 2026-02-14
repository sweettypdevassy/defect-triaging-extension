// Options page script

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  
  // Set up event listeners
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
  document.getElementById('testBtn').addEventListener('click', testNow);
  document.getElementById('clearDashboardBtn').addEventListener('click', clearAndRegenerateDashboard);
});

// Load current settings
async function loadSettings() {
  try {
    const config = await chrome.storage.sync.get({
      ibmUsername: '',
      ibmPassword: '',
      autoLogin: true,
      slackWebhookUrl: '',
      componentName: 'Messaging',
      checkTime: '10:00',
      enabled: true
    });
    
    document.getElementById('ibmUsername').value = config.ibmUsername;
    document.getElementById('ibmPassword').value = config.ibmPassword;
    document.getElementById('autoLogin').checked = config.autoLogin;
    document.getElementById('slackWebhookUrl').value = config.slackWebhookUrl;
    document.getElementById('componentName').value = config.componentName;
    document.getElementById('checkTime').value = config.checkTime;
    document.getElementById('enabled').checked = config.enabled;
    
  } catch (error) {
    showMessage('Error loading settings: ' + error.message, 'error');
  }
}

// Save settings
async function saveSettings(e) {
  e.preventDefault();
  
  try {
    const config = {
      ibmUsername: document.getElementById('ibmUsername').value.trim(),
      ibmPassword: document.getElementById('ibmPassword').value.trim(),
      autoLogin: document.getElementById('autoLogin').checked,
      slackWebhookUrl: document.getElementById('slackWebhookUrl').value.trim(),
      componentName: document.getElementById('componentName').value.trim(),
      checkTime: document.getElementById('checkTime').value,
      enabled: document.getElementById('enabled').checked
    };
    
    // Validate
    if (!config.ibmUsername) {
      showMessage('Please enter your IBM w3id username', 'error');
      return;
    }
    
    if (!config.ibmPassword) {
      showMessage('Please enter your IBM w3id password', 'error');
      return;
    }
    
    if (!config.slackWebhookUrl) {
      showMessage('Please enter a Slack webhook URL', 'error');
      return;
    }
    
    if (!config.componentName) {
      showMessage('Please enter a component name', 'error');
      return;
    }
    
    // Save to storage
    await chrome.storage.sync.set(config);
    
    // Update schedule
    await chrome.runtime.sendMessage({ action: 'updateSchedule' });
    
    showMessage('✓ Settings saved successfully!', 'success');
    
  } catch (error) {
    showMessage('✗ Error saving settings: ' + error.message, 'error');
  }
}

// Test configuration now
async function testNow() {
  const button = document.getElementById('testBtn');
  button.disabled = true;
  button.textContent = 'Testing...';
  
  try {
    // Save settings first
    await saveSettings(new Event('submit'));
    
    // Trigger check
    const response = await chrome.runtime.sendMessage({ action: 'checkNow' });
    
    if (response.success) {
      showMessage('✓ Test successful! Check your Slack channel for the notification.', 'success');
    } else {
      showMessage('✗ Test failed: ' + response.error, 'error');
    }
  } catch (error) {
    showMessage('✗ Error: ' + error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Test Now';
  }
}

// Clear and regenerate dashboard data
async function clearAndRegenerateDashboard() {
  const button = document.getElementById('clearDashboardBtn');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Clearing...';
  
  try {
    // Clear old dashboard data
    await chrome.storage.local.remove(['dailySnapshots', 'weeklyDashboardData']);
    showMessage('✓ Old data cleared. Regenerating with current defect counts...', 'success');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Trigger a check to create new snapshot
    button.textContent = 'Generating...';
    const response = await chrome.runtime.sendMessage({ action: 'checkNow' });
    
    if (response.success) {
      // Wait for snapshot to be stored
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate dashboard
      await chrome.runtime.sendMessage({ action: 'generateDashboard' });
      
      showMessage('✓ Dashboard data regenerated successfully! Refresh the dashboard page to see updated values.', 'success');
    } else {
      showMessage('✗ Error regenerating data: ' + response.error, 'error');
    }
  } catch (error) {
    showMessage('✗ Error: ' + error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

// Show message to user
function showMessage(text, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  // Scroll to message
  messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  // Hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 5000);
  }
}

