# Defect Triaging Chrome Extension

A Chrome extension that automatically monitors IBM Liberty Build Break Report for untriaged defects and sends daily Slack notifications with weekly analytics dashboard.

## 🎯 Features

- ✅ **Automatic Login**: Auto-detects VPN and logs you in with w3id credentials
- ✅ **Daily Automated Checks**: Runs at 10:00 AM IST (configurable)
- ✅ **Slack Notifications**: Sends grouped notifications by component
- ✅ **Multi-Component Support**: Monitor multiple components simultaneously
- ✅ **SOE Triage Integration**: Includes overdue SOE defects in notifications
- ✅ **Weekly Dashboard**: Analytics dashboard with charts and trends (Monday 11 AM)
- ✅ **Session Management**: Maintains IBM session automatically
- ✅ **Auto-Retry**: Automatically retries when you login after session expires
- ✅ **Manual Triggers**: "Check Now" and "Test Now" buttons for immediate checks

## 📋 Prerequisites

- Google Chrome browser
- IBM W3 ID account with access to Build Break Report
- Slack workspace with webhook URL
- IBM VPN connection

## 🚀 Quick Start

### 1. Install Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `defect-triaging-extension` folder
5. Extension icon will appear in Chrome toolbar

### 2. Configure Settings

1. Click the extension icon in Chrome toolbar
2. Click "Settings" button
3. Enter configuration:
   - **IBM w3id Username**: Your IBM email address
   - **IBM w3id Password**: Your w3id password (stored securely)
   - **Enable automatic login**: Keep checked for auto-login
   - **Slack Webhook URL**: Your Slack incoming webhook URL
   - **Component Names**: Comma-separated list (e.g., `JCA, JPA, Spring Boot`)
   - **Check Time**: Time for daily checks (default: 10:00 AM IST)
   - **Weekly Dashboard Time**: Time for weekly dashboard (default: 11:00 AM Tuesday)
4. Click "Save Settings"

### 3. Connect to VPN & Test

1. Connect to IBM VPN
2. Extension will automatically login (within 30 seconds)
3. Click extension icon → "Check Now" to test
4. Verify Slack notification received

## 📱 Usage

### Daily Automatic Checks
- Extension runs automatically at configured time (default 10:00 AM IST)
- Checks all configured components
- Fetches SOE Triage overdue defects
- Sends Slack notification with untriaged defects
- Stores daily snapshot for weekly dashboard

### Manual Checks
- Click extension icon → "Check Now" for immediate check
- Go to Settings → "Test Now" to test configuration

### Weekly Dashboard
- Automatically generated every Monday at 11:00 AM IST
- Shows 7-day trends, charts, and analytics
- Click "📊 View Weekly Dashboard" button to open anytime
- Sent to Slack with summary

### Popup Status Indicators
- 🔐 **Login in Progress**: Authentication happening
- ⚠️ **Not Logged In**: Need to login
- ✅ **Active & Logged In**: Everything working
- Shows last successful login timestamp

## 🔐 Automatic Login

### How It Works
1. Extension detects VPN connection every 30 seconds
2. Checks if already logged in to IBM system
3. If not logged in, opens login page in background
4. Automatically fills w3id credentials
5. Waits for authentication to complete
6. Verifies login success by testing API
7. Closes login tab automatically

### Manual Login (If Needed)
If auto-login fails or you prefer manual login:
1. Open https://libh-proxy1.fyre.ibm.com/buildBreakReport/
2. Login with your IBM W3 ID credentials
3. Complete MFA (IBM Verify, SMS, or passkey)
4. Extension will detect successful login

### Login Verification
The extension now properly verifies login by:
- Testing API with actual data validation
- Checking response contains real defect data (not error/redirect)
- Periodic checking (every 3 seconds) when manual login needed
- Storing verified login state with timestamp

## 📊 Weekly Dashboard Features

### Summary Cards
- Total defects this week
- Untriaged defect count
- Test bugs, product bugs, infrastructure bugs
- Week-over-week trend

### Interactive Charts
- **Daily Trend**: Line chart showing defect trends over 7 days
- **Triage Status**: Pie chart showing distribution
- **Component Comparison**: Bar chart comparing components
- **Week-over-Week**: Comparison with previous week

### Priority Items
- Automatically highlights high untriaged counts
- Shows increasing trends
- Identifies components needing attention

## 🔧 Configuration


### Component Names
Enter comma-separated component names:
```
JCA, JPA, Spring Boot, Messaging, Database
```

### Check Time
24-hour format (HH:MM):
```
10:00  → 10:00 AM
14:30  → 2:30 PM
```

## 🆘 Troubleshooting

### Login Issues

**Problem**: Extension shows "Not Logged In" status

**Solution**:
1. Check credentials in Settings are correct
2. Ensure VPN is connected
3. Try manual login once
4. Check browser console for error messages
5. Extension will auto-detect when you complete login

**Problem**: "Login in Progress" stuck

**Solution**:
1. Wait 60 seconds for timeout
2. Refresh the page if needed
3. Complete manual login with username, password, and passkey
4. Extension will detect successful login automatically

### No Slack Notifications

**Problem**: Not receiving notifications

**Solution**:
1. Check Slack webhook URL is correct
2. Test with "Test Now" button
3. Check console logs for errors
4. Verify Slack webhook is active
5. Ensure Chrome is running at scheduled time

### SOE Defects Not Fresh

**Problem**: SOE Triage defects showing old data

**Solution**:
- This is now fixed! Extension always fetches fresh data
- Added `cache: 'no-cache'` to prevent browser caching
- Waits for Jazz/RTC login to complete before fetching
- Logs show "✅ Jazz/RTC FRESH data received"

### Dashboard Not Loading

**Problem**: Dashboard shows no data

**Solution**:
1. Wait for daily checks to collect data (need 1-7 days)
2. Click "Check Now" to create first snapshot
3. Check console logs for errors
4. Verify extension is running daily checks

### Dashboard Regeneration Missing SOE Data

**Problem**: "Clear and regenerate" doesn't include SOE defects

**Solution**:
- This is now fixed! SOE data is always fetched
- Works in both normal and silent modes
- Includes SOE defects in dashboard regeneration

## 📁 Project Structure

```
defect-triaging-extension/
├── manifest.json           # Extension configuration
├── background.js          # Main extension logic
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── options.html          # Settings page
├── options.js            # Settings functionality
├── dashboard.html        # Weekly dashboard template
├── dashboard.js          # Dashboard rendering logic
├── chart.min.js          # Chart.js library
└── README.md            # This file
```

## 🔒 Security & Privacy

- Extension uses browser's existing IBM session
- Credentials stored securely in Chrome's encrypted storage
- Only accessible by the extension
- Slack webhook URL stored locally in Chrome
- All data stored locally in Chrome storage
- No external servers (except IBM and Slack)
- No tracking or analytics

## 📝 Important Notes

### Session Management
- IBM sessions typically expire after 8-24 hours
- Extension automatically refreshes session every 2 hours
- If laptop shuts down, session will expire
- Extension auto-detects and re-authenticates when VPN reconnects

### Best Practices
1. **Keep Chrome Running**: Helps maintain session
2. **Stay Connected to VPN**: Required for IBM access
3. **Check Slack Daily**: Monitor for login errors
4. **Update Regularly**: Get latest fixes and features
5. **Review Dashboard Weekly**: Track team progress

### Limitations
- Requires IBM VPN connection
- Chrome must be running for scheduled checks
- Session expires when laptop shuts down
- Cannot run when Chrome is closed

## 🎓 Tips

1. **Bookmark IBM URL**: Quick access for manual login if needed
2. **Enable Slack Notifications**: Don't miss defect alerts
3. **Review Dashboard Weekly**: Track team progress
4. **Use "Check Now"**: Test after configuration changes
5. **Check Console Logs**: Helpful for debugging (F12 → Console)
6. **Pin Extension**: Click puzzle icon → pin to toolbar

## 🔄 Recent Fixes (v2.2.0)

### Login Authentication
- ✅ Enhanced authentication verification with actual API data validation
- ✅ Automatic detection of manual login completion (checks every 3 seconds)
- ✅ Persistent login state tracking with timestamps
- ✅ Clear visual feedback in popup showing login status
- ✅ Proper handling of passkey authentication flow

### SOE Triage Defects
- ✅ Fixed caching issue - now always fetches fresh data
- ✅ Added `cache: 'no-cache'` to prevent browser caching
- ✅ Waits for Jazz/RTC login to complete before fetching
- ✅ Always fetches SOE data (even in silent/dashboard regeneration mode)
- ✅ Enhanced logging to show fresh data being fetched

### Weekly Dashboard
- ✅ Changed schedule from Monday to Tuesday (for demo purposes)
- ✅ Dashboard regeneration now includes SOE Triage defects
- ✅ Fixed silent mode skipping SOE fetch

## 📞 Support

For issues or questions:
1. Check this README for troubleshooting
2. Review console logs (F12 → Console)
3. Check extension background logs (chrome://extensions/ → service worker)
4. Verify IBM session is active
5. Test with "Check Now" button


## 📄 License

Internal IBM tool - for authorized users only.

## 🙏 Acknowledgments

Built for IBM Liberty team to streamline defect triaging workflow.

---

**Version**: 2.2.0  
**Last Updated**: February 2026  
**Maintained By**: Development Team