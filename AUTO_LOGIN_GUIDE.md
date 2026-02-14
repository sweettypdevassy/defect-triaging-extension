# IBM w3id Auto-Login Guide

## Overview
The Defect Triaging Extension now includes automatic login functionality that detects when your VPN is connected and automatically logs you into the IBM Build Break Report system using your w3id credentials.

## Features

### 🔐 Automatic Authentication
- **VPN Detection**: Automatically detects when you connect to IBM VPN
- **Auto-Login**: Logs you into IBM w3id authentication system automatically
- **Session Management**: Maintains your login session throughout the day
- **Background Operation**: Works silently in the background without interrupting your work

### 🛡️ Security
- Credentials are stored securely in Chrome's encrypted storage
- Only accessible by the extension
- Never transmitted to any third-party servers
- Only used for IBM w3id authentication

## Setup Instructions

### Step 1: Configure Credentials

1. **Open Extension Settings**
   - Click the extension icon in Chrome toolbar
   - Click "Settings" button

2. **Enter IBM Credentials**
   - **IBM w3id Username**: Your IBM email address (e.g., your.email@ibm.com)
   - **IBM w3id Password**: Your w3id password
   - **Enable automatic login**: Keep this checked (default)

3. **Configure Other Settings**
   - Slack Webhook URL
   - Component Names
   - Check Time
   - Enable automatic daily checks

4. **Save Settings**
   - Click "Save Settings" button
   - You should see "✓ Settings saved successfully!"

### Step 2: Connect to VPN

1. **Connect to IBM VPN**
   - Use your VPN client to connect to IBM network
   - The extension will automatically detect the connection

2. **Automatic Login Process**
   - Extension checks VPN status every 30 seconds
   - When VPN is detected, it automatically:
     - Opens IBM Build Break Report page in background
     - Detects w3id authentication requirement
     - Fills in your credentials
     - Submits the login form
     - Closes the tab after successful login

3. **Verification**
   - Check browser console for login status messages
   - Look for: "✓ Successfully logged in to IBM system!"

## How It Works

### VPN Detection
```
Every 30 seconds:
├── Check if IBM server is reachable
├── If reachable → VPN is connected
└── If not reachable → VPN is disconnected
```

### Auto-Login Flow
```
VPN Connected
├── Check if already logged in
│   ├── Yes → Do nothing
│   └── No → Initiate login
│
└── Login Process
    ├── Open IBM page in background tab
    ├── Detect w3id authentication page
    ├── Fill username and password
    ├── Submit login form
    ├── Wait for successful authentication
    └── Close background tab
```

### Authentication Pages Handled
The extension automatically handles these authentication scenarios:

1. **w3id Password Login**
   - Standard username/password form
   - Automatically fills and submits credentials

2. **Passkey (IBM Preferred)**
   - If you see the passkey option, select "w3id Password" manually
   - Extension will then handle the password authentication

3. **IBM Verify**
   - Extension handles initial login
   - You may need to approve on IBM Verify app manually

## Troubleshooting

### Login Not Working

**Problem**: Extension doesn't auto-login after VPN connection

**Solutions**:
1. **Check Credentials**
   - Open Settings and verify username/password are correct
   - Ensure "Enable automatic login" is checked

2. **Check VPN Connection**
   - Verify you're connected to IBM VPN
   - Try accessing https://libh-proxy1.fyre.ibm.com/buildBreakReport/ manually

3. **Check Browser Console**
   - Open Chrome DevTools (F12)
   - Go to Console tab
   - Look for extension messages starting with 🔐, ✓, or ❌

4. **Manual Login**
   - If auto-login fails, login manually once
   - Extension will maintain the session

### Passkey Prompt Appears

**Problem**: IBM shows passkey authentication instead of password

**Solution**:
1. On the w3id authentication page, look for "choose a different sign-in option"
2. Select "w3id Password" option
3. Extension will then auto-fill credentials
4. Or login manually once - extension will maintain session

### Session Expires

**Problem**: Need to login again during the day

**Solution**:
- Extension automatically refreshes session every 2 hours
- If session expires, disconnect and reconnect VPN
- Extension will auto-login again

### VPN Not Detected

**Problem**: Extension doesn't detect VPN connection

**Solutions**:
1. **Wait 30 seconds**: VPN check runs every 30 seconds
2. **Check Network**: Ensure you can access IBM internal sites
3. **Restart Extension**: 
   - Go to chrome://extensions/
   - Toggle the extension off and on
4. **Check Permissions**: Ensure extension has required permissions

## Console Messages

### Success Messages
- `✓ VPN Connected - Checking login status...`
- `✓ Already logged in to IBM system`
- `✓ Successfully logged in to IBM system!`
- `✓ IBM session keepalive successful`

### Info Messages
- `🔐 Attempting automatic login...`
- `🔑 Not logged in, initiating w3id authentication...`
- `🔐 Detected w3id login page, attempting to fill credentials...`

### Warning Messages
- `⚠️ IBM credentials not configured`
- `⚠️ Auto-login timeout - please login manually`
- `✗ VPN Disconnected`

### Error Messages
- `❌ Auto-login error: [error details]`

## Best Practices

### 1. Keep Credentials Updated
- Update extension settings if you change your w3id password
- Test auto-login after password changes

### 2. VPN Connection
- Connect to VPN before starting work
- Extension will auto-login within 30 seconds
- Keep VPN connected throughout the day

### 3. Session Management
- Extension maintains session automatically
- No need to manually refresh or re-login
- Session keepalive runs every 2 hours

### 4. Security
- Don't share your extension settings
- Use strong w3id password
- Keep Chrome updated for security patches

## Advanced Configuration

### Disable Auto-Login
If you prefer manual login:
1. Open Settings
2. Uncheck "Enable automatic login when VPN is connected"
3. Save Settings

### Adjust VPN Check Frequency
Currently checks every 30 seconds. To modify:
1. Edit `background.js`
2. Find `setupVPNDetection()` function
3. Change `periodInMinutes: 0.5` to desired interval

### Custom Authentication Flow
If your organization uses custom authentication:
1. Edit `fillW3IDCredentials()` function in `background.js`
2. Adjust selectors to match your login page
3. Test thoroughly before deploying

## FAQ

**Q: Is my password stored securely?**
A: Yes, credentials are stored in Chrome's encrypted sync storage, which is protected by your Chrome profile.

**Q: Can I use this without VPN?**
A: No, IBM Build Break Report requires VPN connection. The extension detects VPN and auto-logs you in.

**Q: What if I have 2FA enabled?**
A: Extension handles initial login. You'll need to approve 2FA prompts (IBM Verify) manually.

**Q: Does this work with passkeys?**
A: Extension is designed for password authentication. If passkey prompt appears, select "w3id Password" option.

**Q: How often does it check VPN status?**
A: Every 30 seconds. This is frequent enough to detect connections quickly without excessive resource usage.

**Q: Will it work if my laptop was off during scheduled check?**
A: Yes! When you turn on your laptop and connect to VPN, the extension will auto-login and perform any missed checks.

## Support

If you encounter issues:

1. **Check Console Logs**: Open DevTools (F12) → Console
2. **Verify Settings**: Ensure all credentials are correct
3. **Test Manually**: Try logging in manually to verify credentials
4. **Check VPN**: Ensure VPN is connected and working
5. **Restart Extension**: Toggle extension off/on in chrome://extensions/

## Version History

### v2.1.0 (Current)
- ✨ Added automatic VPN detection
- ✨ Added automatic w3id login
- ✨ Added session keepalive (every 2 hours)
- 🔒 Secure credential storage
- 📊 Enhanced logging and debugging

### v2.0.0
- 📊 Weekly dashboard functionality
- 📈 Multi-component support
- 🔔 Enhanced Slack notifications

### v1.0.0
- 🎯 Initial release
- ⏰ Daily defect checking
- 📢 Slack notifications