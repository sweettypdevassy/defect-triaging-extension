// Popup script for defect triaging extension

document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  
  // Set up event listeners
  document.getElementById('checkNowBtn').addEventListener('click', checkNow);
  document.getElementById('pauseToggle').addEventListener('change', togglePause);
  document.getElementById('dashboardBtn').addEventListener('click', openDashboard);
  document.getElementById('optionsBtn').addEventListener('click', openOptions);
});

// Load and display current status
async function loadStatus() {
  try {
    const config = await chrome.storage.sync.get({
      enabled: true,
      paused: false,
      componentName: 'Messaging',
      checkTime: '10:00',
      lastCheck: null,
      slackWebhookUrl: ''
    });
    
    // Check login status
    const localStorage = await chrome.storage.local.get(['loginVerified', 'lastSuccessfulLogin', 'loginInProgress']);
    
    // Update status
    const statusDiv = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    const pauseToggle = document.getElementById('pauseToggle');
    const toggleLabel = document.getElementById('toggleLabel');
    
    // Update toggle switch
    pauseToggle.checked = !config.paused;
    toggleLabel.textContent = config.paused ? 'OFF' : 'ON';
    toggleLabel.style.color = config.paused ? '#dc3545' : '#28a745';
    
    // Check if login is in progress
    if (localStorage.loginInProgress) {
      statusDiv.className = 'status warning';
      statusText.textContent = '🔐 Login in Progress...';
    } else if (!localStorage.loginVerified) {
      // Not logged in
      statusDiv.className = 'status warning';
      statusText.textContent = '⚠️ Not Logged In - Click Settings to Login';
    } else if (config.paused) {
      statusDiv.className = 'status disabled';
      statusText.textContent = 'Paused';
    } else if (config.enabled && config.slackWebhookUrl) {
      statusDiv.className = 'status enabled';
      statusText.textContent = '✅ Active & Logged In';
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
    
    // Show last successful login time if available
    if (localStorage.lastSuccessfulLogin) {
      const loginDate = new Date(localStorage.lastSuccessfulLogin);
      const loginInfo = document.createElement('div');
      loginInfo.style.fontSize = '11px';
      loginInfo.style.color = '#666';
      loginInfo.style.marginTop = '5px';
      loginInfo.textContent = `Last login: ${loginDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'short',
        timeStyle: 'short'
      })}`;
      
      // Add to status div if not already there
      const existingLoginInfo = statusDiv.querySelector('.login-info');
      if (existingLoginInfo) {
        existingLoginInfo.remove();
      }
      loginInfo.className = 'login-info';
      statusDiv.appendChild(loginInfo);
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

// Toggle pause/resume
async function togglePause() {
  const pauseToggle = document.getElementById('pauseToggle');
  const toggleLabel = document.getElementById('toggleLabel');
  
  pauseToggle.disabled = true;
  
  try {
    const newPausedState = !pauseToggle.checked;
    
    // Send message to background script
    const action = newPausedState ? 'pauseExtension' : 'resumeExtension';
    const response = await chrome.runtime.sendMessage({ action });
    
    if (response && response.success) {
      // Update toggle label
      toggleLabel.textContent = newPausedState ? 'OFF' : 'ON';
      toggleLabel.style.color = newPausedState ? '#dc3545' : '#28a745';
      
      showMessage(`${newPausedState ? '⏸️ Extension paused' : '▶️ Extension resumed'} - ${newPausedState ? 'all checks stopped' : 'checks restarted'}`, 'success');
      
      // Reload status to reflect changes
      await loadStatus();
    } else {
      // Revert toggle if failed
      pauseToggle.checked = !pauseToggle.checked;
      showMessage('✗ Failed to toggle: ' + (response?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Error toggling pause:', error);
    // Revert toggle on error
    pauseToggle.checked = !pauseToggle.checked;
    showMessage('✗ Error: ' + error.message, 'error');
  } finally {
    pauseToggle.disabled = false;
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

