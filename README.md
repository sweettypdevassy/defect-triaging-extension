# Defect Triaging Chrome Extension

A Chrome extension that automatically monitors IBM Liberty Build Break Report for untriaged defects and sends daily Slack notifications.

## 🆕 New in v2.1.0: Automatic VPN Login

The extension now automatically detects when you connect to IBM VPN and logs you into the Build Break Report system using your w3id credentials!

**Key Features:**
- 🔐 **Auto-Login**: Automatically authenticates when VPN is connected
- 🔍 **VPN Detection**: Checks VPN status every 30 seconds
- 🔒 **Secure Storage**: Credentials stored securely in Chrome
- 🔄 **Session Management**: Maintains login throughout the day

**[📖 Read the Complete Auto-Login Guide](AUTO_LOGIN_GUIDE.md)** for detailed setup and usage instructions.

---

## 🎯 Features

- ✅ **Automatic VPN Login**: Auto-detects VPN and logs you in (NEW!)
- ✅ **Daily Automated Checks**: Runs at 10:00 AM IST (configurable)
- ✅ **Slack Notifications**: Sends grouped notifications by component
- ✅ **Multi-Component Support**: Monitor multiple components simultaneously
- ✅ **Weekly Dashboard**: Analytics dashboard with charts and trends (Monday 11 AM)
- ✅ **Session Keepalive**: Maintains IBM session to reduce login frequency
- ✅ **Auto-Retry**: Automatically retries when you login after session expires
- ✅ **Manual Triggers**: "Check Now" and "Test Now" buttons for immediate checks

## 📋 Prerequisites

- Google Chrome browser
- IBM W3 ID account with access to Build Break Report
- Slack workspace with webhook URL
- Active IBM session (login required)

## 🚀 Installation

### Step 1: Download Extension

Clone or download this repository to your local machine.

### Step 2: Install in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `defect-triaging-extension` folder
5. Extension icon will appear in Chrome toolbar

### Step 3: Configure Extension

1. Click the extension icon in Chrome toolbar
2. Click "Settings" button
3. Enter configuration:
   - **IBM w3id Username**: Your IBM email address (for auto-login)
   - **IBM w3id Password**: Your w3id password (stored securely)
   - **Enable automatic login**: Keep checked for auto-login feature
   - **Slack Webhook URL**: Your Slack incoming webhook URL
   - **Component Names**: Comma-separated list (e.g., `Messaging, Database, Security`)
   - **Check Time**: Time for daily checks (default: 10:00 AM)
4. Click "Save Settings"

### Step 4: Connect to VPN

1. Connect to IBM VPN using your VPN client
2. Extension will automatically detect VPN connection (within 30 seconds)
3. Extension will automatically login to IBM Build Break Report
4. Check browser console for confirmation: "✓ Successfully logged in to IBM system!"

**Note**: If you prefer manual login, uncheck "Enable automatic login" in settings and follow the manual login process below.

### Manual Login (Optional)

If auto-login is disabled or you prefer manual login:

1. Open https://libh-proxy1.fyre.ibm.com/buildBreakReport/
2. Login with your IBM W3 ID credentials
3. Complete MFA (IBM Verify, SMS, or passkey)
4. Keep this tab open or Chrome running

### Step 5: Test

1. Click extension icon
2. Click "Check Now" button
3. Verify Slack notification received
4. Check console logs for any errors

## 📱 Usage

### Daily Automatic Checks

- Extension runs automatically at configured time (default 10:00 AM IST)
- Checks all configured components
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

## 🔧 Configuration Options

### Slack Webhook URL

Get your webhook URL from Slack:
1. Go to https://api.slack.com/apps
2. Create new app or select existing
3. Enable "Incoming Webhooks"
4. Create webhook for your channel
5. Copy webhook URL

### Component Names

Enter comma-separated component names:
```
Messaging, Database, Security, Batch
```

### Check Time

24-hour format (HH:MM):
```
10:00  → 10:00 AM
14:30  → 2:30 PM
```

## 📊 Dashboard Features

### Summary Cards
- Total defects this week
- Average daily defects
- Current untriaged count
- Week-over-week change

### Charts
- Daily defect trend (line chart)
- Triage status breakdown (pie chart)
- Component breakdown (bar chart)
- Week-over-week comparison (grouped bar chart)

### Priority Items
- Top 5 components by defect count
- Status and trend indicators

## 🔐 Session Management

### Session Keepalive

Extension automatically:
- Sends request to IBM every 2 hours
- Refreshes session cookies
- Reduces login frequency

### Auto-Retry

If session expires:
- Extension detects "Not logged in" error
- Sends Slack notification
- Automatically retries when you login again
- No manual intervention needed

### Login Requirements

- **Initial**: Login once when you start using extension
- **Ongoing**: Login when session expires (typically daily if laptop shuts down)
- **Best Practice**: Keep Chrome running to maintain session

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
├── chart.min.js          # Chart.js library (local)
├── icon16.png           # Extension icon (16x16)
├── icon48.png           # Extension icon (48x48)
├── icon128.png          # Extension icon (128x128)
└── README.md            # This file
```

## 📚 Documentation

- **INSTALLATION.md**: Detailed installation guide
- **TESTING_GUIDE.md**: Testing and troubleshooting
- **WEEKLY_DASHBOARD_GUIDE.md**: Dashboard features and usage
- **DASHBOARD_DATA_GUIDE.md**: Understanding dashboard metrics
- **DATA_COLLECTION_TIMING.md**: When and how data is collected
- **DUPLICATE_FIX.md**: Fixing duplicate notification issues
- **CHANGELOG.md**: Version history and updates

## 🆘 Troubleshooting

### "Not logged in" Error

**Problem**: Extension can't access IBM system

**Solution**:
1. Open https://libh-proxy1.fyre.ibm.com/buildBreakReport/
2. Login with IBM W3 ID
3. Complete MFA
4. Extension will auto-retry

### No Slack Notifications

**Problem**: Not receiving notifications

**Solution**:
1. Check Slack webhook URL is correct
2. Test with "Test Now" button
3. Check console logs for errors
4. Verify Slack webhook is active

### Duplicate Notifications

**Problem**: Receiving multiple notifications

**Solution**:
1. Check only one instance of extension is installed
2. Reload extension: chrome://extensions/ → reload icon
3. See DUPLICATE_FIX.md for details

### Dashboard Not Loading

**Problem**: Dashboard shows no data

**Solution**:
1. Wait for daily checks to collect data (need 1-7 days)
2. Check console logs for errors
3. Verify extension is running daily checks
4. See TESTING_GUIDE.md for debugging

## 🔄 Updates

### Updating Extension

1. Download latest version
2. Go to chrome://extensions/
3. Click reload icon on extension
4. Settings are preserved

### Version History

See CHANGELOG.md for detailed version history.

## ⚙️ Advanced Configuration

### Custom Check Schedule

Edit check time in settings to run at different times:
- Morning: 09:00
- Afternoon: 14:00
- Evening: 18:00

### Multiple Components

Monitor multiple components by separating with commas:
```
Messaging, Database, Security, Batch, CDI, MCP
```

### Dashboard Schedule

Weekly dashboard runs every Monday at 11:00 AM IST (not configurable).

## 🔒 Security & Privacy

- Extension uses browser's existing IBM session
- No credentials stored
- Slack webhook URL stored locally in Chrome
- All data stored locally in Chrome storage
- No external servers (except IBM and Slack)

## 📝 Notes

### Session Expiration

- IBM sessions typically expire after 8-24 hours of inactivity
- If laptop shuts down, session will expire
- Need to login again next morning
- Session keepalive helps but doesn't prevent all expirations

### Best Practices

1. **Keep Chrome Running**: Helps maintain session
2. **Login Before 10 AM**: Ensures daily check works
3. **Check Slack Daily**: Monitor for login errors
4. **Update Regularly**: Get latest fixes and features

### Limitations

- Requires active IBM session (cannot automate login/MFA)
- Session expires when laptop shuts down
- Need to be logged in for checks to work
- Cannot run when Chrome is closed

## 🎓 Tips

1. **Bookmark IBM URL**: Quick access for login
2. **Enable Slack Notifications**: Don't miss defect alerts
3. **Review Dashboard Weekly**: Track team progress
4. **Use "Check Now"**: Test after configuration changes
5. **Check Console Logs**: Helpful for debugging

## 📞 Support

For issues or questions:
1. Check TESTING_GUIDE.md for troubleshooting
2. Review console logs (chrome://extensions/ → service worker)
3. Verify IBM session is active
4. Test with "Check Now" button

## 🚀 Future Enhancements

Potential features for future versions:
- Custom notification templates
- Email notifications
- Multiple Slack channels
- Defect filtering rules
- Historical data export
- Mobile app integration

## 📄 License

Internal IBM tool - for authorized users only.

## 🙏 Acknowledgments

Built for IBM Liberty team to streamline defect triaging workflow.

---

**Version**: 2.0.0  
**Last Updated**: February 2026  
**Maintained By**: Development Team