# 🔔 Defect Triaging Notifier - Chrome Extension

Automated Slack notifications for untriaged defects from IBM Liberty Build Break Report.

## Overview

This Chrome extension automatically checks for untriaged defects daily and sends notifications to your Slack channel. It runs in your browser using your existing IBM login session, eliminating authentication issues.

## Features

- ✅ **Automatic Daily Checks** - Runs at 10:00 AM IST (configurable)
- ✅ **Slack Integration** - Sends formatted notifications to your channel
- ✅ **Browser-Based** - Uses your existing IBM login session
- ✅ **Session Keepalive** - Automatically keeps IBM session active 24/7 (every 2 hours)
- ✅ **Fast Auto-Retry** - Checks for login every minute and auto-retries within 1 minute
- ✅ **No Daily Login** - Session stays alive automatically, no manual login needed
- ✅ **Manual Trigger** - Check defects anytime with one click
- ✅ **Configurable** - Set component, time, and webhook URL
- ✅ **No Authentication Issues** - Works with IBM SSO seamlessly

## Quick Start

1. **Install the Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `defect-triaging-extension` folder

2. **Configure Settings**
   - Click the extension icon in the toolbar
   - Click "Settings"
   - Enter your Slack webhook URL
   - Set component name (e.g., "Messaging")
   - Set check time (default: 10:00 AM IST)
   - Click "Save Settings"

3. **Test It**
   - Make sure you're logged in to IBM Build Break Report
   - Click "Test Now" in settings
   - Check your Slack channel for notification

## Files

```
defect-triaging-extension/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── options.html          # Settings page UI
├── options.js            # Settings functionality
├── INSTALLATION.md       # Detailed installation guide
└── README.md            # This file
```

## Configuration

### Slack Webhook URL
Get your webhook URL from Slack:
- Your webhook should accept JSON: `{"message": "text"}`
- Example: `https://hooks.slack.com/triggers/E27SFGS2W/...`

### Component Name
- Must match exactly as shown in IBM Build Break Report
- Examples: "Messaging", "Batch", "CDI", "Core Security"

### Check Time
- Format: HH:MM (24-hour)
- Timezone: IST (India Standard Time)
- Default: 10:00 (10:00 AM IST)

## How It Works

1. **Session Keepalive**
   - Extension automatically refreshes IBM session every 2 hours
   - Runs 24/7 to prevent session expiry
   - No manual login needed - session stays alive automatically

2. **Auto-Retry Check**
   - Checks every 1 minute for login status (no API calls)
   - Auto-retries defect check within 1 minute after login
   - Minimal resource usage

3. **Scheduled Check**
   - Extension sets up a daily alarm at configured time
   - When alarm triggers, it calls the IBM API

4. **Fetch Defects**
   - Makes GET request to IBM Build Break Report API
   - Uses browser's existing cookies (your login session)
   - Parses the JSON response

5. **Send Notification**
   - Formats defect information
   - Sends to Slack webhook
   - Shows browser notification

6. **Repeat Daily**
   - Automatically repeats every 24 hours
   - No manual intervention needed

## API Endpoint

The extension uses the IBM Build Break Report API to fetch defect information for configured components.

## Slack Notification Format

The extension sends formatted notifications to Slack with defect details including ID, summary, builds reported, state, and owner information. Notifications are grouped by component when monitoring multiple components.

## Troubleshooting

### Not Logged In Error
- The extension now includes automatic session keepalive
- Refreshes your IBM session every hour during work hours (9 AM - 6 PM IST)
- If you still see this error:
  - Open https://libh-proxy1.fyre.ibm.com/buildBreakReport/
  - Log in with your IBM credentials
  - The extension will keep the session alive automatically

### No Slack Notification
- Verify webhook URL is correct
- Test webhook manually with curl
- Check Slack webhook is still active

### Extension Not Running
- Chrome must be running at scheduled time
- Check extension is enabled in `chrome://extensions/`
- Check "Last Check" time in extension popup

## Development

### Testing Changes
1. Make changes to files
2. Go to `chrome://extensions/`
3. Click refresh icon on the extension
4. Test with "Check Now" button

### Debugging
- Open `chrome://extensions/`
- Click "Details" on the extension
- Click "Inspect views: background page"
- Check console for errors

## Requirements

- Google Chrome or Microsoft Edge (Chromium-based)
- Access to IBM Liberty Build Break Report
- Slack webhook URL
- Chrome must be running for scheduled checks

## Limitations

- Chrome must be running at scheduled time
- Requires initial IBM login (then kept alive automatically)
- Maximum 10 defects shown per component in notification (to avoid message size limits)

## Security

- Extension only accesses IBM and Slack domains
- No data is stored externally
- Webhook URL stored in Chrome's sync storage
- Uses browser's existing authentication

## License

MIT

## Support

For issues or questions:
1. Check INSTALLATION.md for detailed setup
2. Review browser console for errors
3. Verify IBM login is active
4. Test webhook URL manually

---

**Made with ❤️ for automated defect triaging**