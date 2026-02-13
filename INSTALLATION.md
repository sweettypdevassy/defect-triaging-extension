# Installation Guide - Defect Triaging Notifier Chrome Extension

## Prerequisites

- Google Chrome or Microsoft Edge browser
- Access to IBM Liberty Build Break Report (must be able to log in)
- Slack webhook URL for your defect trackinf channel

## Step 1: Install the Extension in Chrome

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Or click the three dots menu → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `defect-triaging-extension` folder
   - Click "Select" or "Open"

4. **Verify Installation**
   - You should see "Defect Triaging Notifier" in your extensions list

## Step 2: Configure the Extension

1. **Click the Extension Icon**
   - Click the  icon in your Chrome toolbar
   - Click "Settings" button

2. **Enter Configuration**
   - **Slack Webhook URL**: Paste your Slack webhook URL
   - **Component Name**: Enter your component name (e.g., Messaging, Batch, CDI)
   - **Daily Check Time**: Set to `10:00` (10:00 AM IST) or your preferred time
   - **Enable automatic daily checks**: Keep checked ✓

3. **Save Settings**
   - Click "Save Settings" button
   - You should see a success message

## Step 3: Test the Extension

1. **Log in to IBM**
   - Open https://libh-proxy1.fyre.ibm.com/buildBreakReport/ in a new tab
   - Make sure you're logged in

2. **Test the Extension**
   - Go back to the extension settings page
   - Click "Test Now" button
   - Wait a few seconds

3. **Check Slack**
   - Go to your defect tracking Slack channel
   - You should see a notification with defect information

## Step 4: Verify Automatic Schedule

1. **Check Extension Status**
   - Click the extension icon
   - Status should show "Active"
   - Next check time should be displayed

2. **The extension will now:**
   - Check for defects daily at 10:00 AM IST
   - Send Slack notifications automatically
   - Show browser notifications when checks complete

## Troubleshooting

### Extension Not Working

**Problem**: "Not logged in to IBM system" error

**Solution**:
1. Open https://libh-proxy1.fyre.ibm.com/buildBreakReport/ in Chrome
2. Log in with your IBM credentials
3. Keep the tab open or visit it regularly
4. The extension uses your browser's login session

**Problem**: No Slack notification received

**Solution**:
1. Verify your webhook URL is correct
2. Test the webhook manually:
   ```bash
   curl -X POST your_webhook_url \
     -H "Content-Type: application/json" \
     -d '{"message": "Test from terminal"}'
   ```
3. Check if the webhook is still active in Slack settings

**Problem**: Extension icon not showing

**Solution**:
1. Click the puzzle piece icon in Chrome toolbar
2. Find "Defect Triaging Notifier"
3. Click the pin icon to pin it to toolbar


### Schedule Not Running

1. Make sure "Enable automatic daily checks" is checked
2. Chrome must be running at the scheduled time
3. Check the extension popup for "Last Check" time
4. You can manually trigger with "Check Now" button

## Usage

### Daily Automatic Checks
- Extension runs automatically at 10:00 AM IST
- No action needed from you
- Notifications sent to Slack automatically

### Manual Check
1. Click the extension icon
2. Click "Check Now" button
3. Wait for the notification

### Change Settings
1. Click the extension icon
2. Click "Settings" button
3. Update configuration
4. Click "Save Settings"

## Updating the Extension

If you make changes to the extension files:

1. Go to `chrome://extensions/`
2. Find "Defect Triaging Notifier"
3. Click the refresh icon (🔄)
4. Extension will reload with new changes

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "Defect Triaging Notifier"
3. Click "Remove"
4. Confirm removal

## Important Notes

⚠️ **Browser Must Be Running**
- Chrome must be running for scheduled checks to work
- If Chrome is closed at 10 AM, the check won't run
- Consider keeping Chrome running or setting it to start on login

⚠️ **Stay Logged In**
- You must be logged in to IBM Build Break Report
- The extension uses your browser's session
- If your session expires, log in again

⚠️ **Webhook Security**
- Keep your webhook URL private
- Don't share it publicly
- Regenerate if compromised

## Support

If you encounter issues:
1. Check the browser console for errors (F12 → Console)
2. Check extension background page: `chrome://extensions/` → Details → Inspect views: background page
3. Verify you're logged in to IBM
4. Test the webhook URL manually

---

**You're all set!** The extension will now automatically check for defects and send Slack notifications daily at 10 AM IST. 🎉