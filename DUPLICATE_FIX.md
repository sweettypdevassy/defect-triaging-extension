# Duplicate Notification Fix

## Problem
Extension was sending 2 Slack notifications (4 seconds apart) when clicking "Check Now" or "Test Now" buttons.

## Root Causes Found and Fixed

### 1. Duplicate Alarm Listeners ✅ FIXED
- **Location**: Lines 137 and 897
- **Issue**: Two `chrome.alarms.onAlarm.addListener` calls both responding to 'dailyDefectCheck' alarm
- **Fix**: Merged into single listener at line 137, added 'weeklyDashboard' handler, removed duplicate at line 897

### 2. Duplicate Message Listeners ✅ FIXED
- **Location**: Lines 492 and 902
- **Issue**: Two `chrome.runtime.onMessage.addListener` calls both responding to 'checkNow' action
- **Fix**: Merged into single listener at line 492, added 'openDashboard' and 'generateDashboard' handlers, removed duplicate at line 902

## Current State
Now the extension has only ONE of each listener type:
- ✅ 1 `chrome.runtime.onInstalled.addListener` (line 13)
- ✅ 1 `chrome.alarms.onAlarm.addListener` (line 137)
- ✅ 1 `chrome.runtime.onMessage.addListener` (line 492)

## Testing Instructions

### Step 1: Reload Extension
1. Go to `chrome://extensions`
2. Find "Defect Triaging Notifier"
3. Click the reload icon (circular arrow)

### Step 2: Test "Check Now" Button
1. Click the extension icon in Chrome toolbar
2. Click "Check Now" button
3. **Expected**: Receive exactly 1 Slack notification
4. **Check**: Look at notification timestamps - should be only one

### Step 3: Test "Test Now" Button
1. Right-click extension icon → Options
2. Click "Test Now" button
3. **Expected**: Receive exactly 1 Slack notification
4. **Check**: Look at notification timestamps - should be only one

### Step 4: Verify Console Logs
1. Go to `chrome://extensions`
2. Click "service worker" link under the extension
3. Click "Check Now" or "Test Now"
4. **Expected Console Output** (should appear only ONCE):
   ```
   Daily defect check triggered
   Checking defects for components: Messaging
   Fetching defects for component: Messaging
   Found X untriaged defects for Messaging
   Sending Slack notification...
   ```

## What Was Causing Duplicates

When you clicked "Check Now":
1. First message listener (line 492) called `checkDefects()` → Sent notification #1
2. Second message listener (line 902) ALSO called `checkDefects()` → Sent notification #2

Both listeners were active simultaneously, so every button click triggered both, resulting in 2 notifications.

## Verification
After reload, you should see:
- ✅ Only 1 notification per button click
- ✅ Only 1 set of console logs per action
- ✅ Notifications 0-5 seconds apart (not 4+ seconds)