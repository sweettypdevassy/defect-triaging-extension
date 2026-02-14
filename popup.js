// Popup script for defect triaging extension

document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  
  // Set up event listeners
  document.getElementById('checkNowBtn').addEventListener('click', checkNow);
  document.getElementById('dashboardBtn').addEventListener('click', openDashboard);
  document.getElementById('optionsBtn').addEventListener('click', openOptions);
});

// Load and display current status
async function loadStatus() {
  try {
    const config = await chrome.storage.sync.get({
      enabled: true,
      componentName: 'Messaging',
      checkTime: '10:00',
      lastCheck: null,
      slackWebhookUrl: ''
    });
    
    // Update status
    const statusDiv = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    
    if (config.enabled && config.slackWebhookUrl) {
      statusDiv.className = 'status enabled';
      statusText.textContent = 'Active';
    } else if (!config.slackWebhookUrl) {
      statusDiv.className = 'status disabled';
      statusText.textContent = 'Not Configured - Click Settings';
    } else {
      statusDiv.className = 'status disabled';
      statusText.textContent = 'Disabled';
    }
    
    // Update info
    document.getElementById('componentName').textContent = config.componentName;
    document.getElementById('checkTime').textContent = config.checkTime + ' IST';
    
    if (config.lastCheck) {
      const lastCheckDate = new Date(config.lastCheck);
      document.getElementById('lastCheck').textContent = lastCheckDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'short',
        timeStyle: 'short'
      });
    }
    
  } catch (error) {
    showMessage('Error loading status: ' + error.message, 'error');
  }
}

// Check defects now
async function checkNow() {
  const button = document.getElementById('checkNowBtn');
  button.disabled = true;
  button.textContent = 'Checking...';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkNow' });
    
    if (response.success) {
      showMessage('✓ Defect check completed! Check Slack for notification.', 'success');
      await loadStatus(); // Refresh status
    } else {
      showMessage('✗ Check failed: ' + response.error, 'error');
    }
  } catch (error) {
    showMessage('✗ Error: ' + error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Check Now';
  }
}

// Open options page
function openOptions() {
  chrome.runtime.openOptionsPage();
}

// Open weekly dashboard
async function openDashboard() {
  const button = document.getElementById('dashboardBtn');
  button.disabled = true;
  button.textContent = '📊 Opening...';
  
  try {
    // First, generate/refresh dashboard data
    await chrome.runtime.sendMessage({ action: 'generateDashboard' });
    
    // Then open the dashboard
    await chrome.runtime.sendMessage({ action: 'openDashboard' });
    
    showMessage('✓ Dashboard opened in new tab!', 'success');
  } catch (error) {
    showMessage('✗ Error opening dashboard: ' + error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = '📊 View Weekly Dashboard';
  }
}

// Show message to user
function showMessage(text, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

