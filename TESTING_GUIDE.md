# 🧪 Testing Guide - Weekly Dashboard Feature

## Quick Test (5 Minutes)

Follow these steps to test the weekly dashboard immediately:

### Step 1: Reload the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Find "Defect Triaging Notifier" extension
3. Click the **refresh/reload icon** (circular arrow)
4. Check that it says "Errors: 0" (no errors)

### Step 2: Check Background Console
1. On the extension card, click **"Inspect views: service worker"**
2. This opens the background console
3. Look for these messages:
   ```
   Defect Triaging Notifier installed
   Setting up weekly dashboard...
   Next weekly dashboard scheduled for: [Monday date]
   ```
4. If you see errors, note them down

### Step 3: Test Manual Dashboard Access
1. Click the extension icon in Chrome toolbar
2. You should see a new green button: **"📊 View Weekly Dashboard"**
3. Click this button
4. **Expected Result:** 
   - Dashboard opens in a new tab
   - You might see "No data available" message (this is normal for first time)
   - Or you might see a dashboard with limited data

### Step 4: Create First Data Snapshot
1. Make sure you're logged in to IBM Build Break Report:
   - Open https://libh-proxy1.fyre.ibm.com/buildBreakReport/
   - Log in if needed
2. Click the extension icon
3. Click **"Check Now"** button
4. Wait for "Check completed" message
5. Check your Slack for the daily notification

### Step 5: View Dashboard with Data
1. Click extension icon again
2. Click **"📊 View Weekly Dashboard"**
3. **Expected Result:**
   - Dashboard opens in new tab
   - Shows data from the check you just ran
   - Charts display (might be minimal with only 1 day of data)

---

## Detailed Testing Scenarios

### Scenario 1: Test Dashboard Display

**Purpose:** Verify dashboard HTML and charts load correctly

**Steps:**
1. Click "📊 View Weekly Dashboard" button
2. Dashboard opens in new tab

**What to Check:**
- ✅ Page title: "Weekly Defect Dashboard"
- ✅ Header shows "📊 Weekly Defect Dashboard"
- ✅ Week date range displays
- ✅ 6 summary cards display (even if showing 0)
- ✅ Charts load (you should see Chart.js visualizations)
- ✅ No JavaScript errors in console (press F12)

**Expected Behavior:**
- If no data: Shows "No data available" message
- If data exists: Shows charts and metrics

**Troubleshooting:**
- If charts don't load: Check internet connection (Chart.js loads from CDN)
- If page is blank: Check browser console (F12) for errors
- If "No data available": Run "Check Now" first to create data

---

### Scenario 2: Test Data Collection

**Purpose:** Verify daily snapshots are being stored

**Steps:**
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Expand **Storage** → **Local Storage**
4. Click on your extension's URL
5. Look for key: `dailySnapshots`

**What to Check:**
- ✅ Key exists after running "Check Now"
- ✅ Value is a JSON object with dates
- ✅ Each date has: total, untriaged, testBugs, productBugs, infraBugs

**Example Data:**
```json
{
  "2026-02-13": {
    "date": "2026-02-13",
    "total": 34,
    "untriaged": 12,
    "testBugs": 15,
    "productBugs": 5,
    "infraBugs": 2,
    "componentBreakdown": [...]
  }
}
```

**Troubleshooting:**
- If no data: Run "Check Now" and check again
- If data is empty: Check background console for errors
- If data looks wrong: Verify component names in settings

---

### Scenario 3: Test Dashboard Generation

**Purpose:** Verify dashboard data is generated correctly

**Steps:**
1. Open background console (chrome://extensions/ → Inspect views)
2. Run this command in console:
   ```javascript
   chrome.runtime.sendMessage({action: 'generateDashboard'}, (response) => {
     console.log('Dashboard generation:', response);
   });
   ```
3. Check for success message

**What to Check:**
- ✅ Console shows "Generating weekly dashboard..."
- ✅ Console shows "Weekly dashboard data generated and stored"
- ✅ No errors in console

**Check Generated Data:**
1. In DevTools Application tab
2. Look for key: `weeklyDashboardData`
3. Should contain:
   - weekStart, weekEnd
   - summary (totalDefects, untriaged, etc.)
   - dailyTrend (labels, total, untriaged arrays)
   - triageBreakdown
   - componentBreakdown
   - weekComparison
   - priorityItems
   - componentDetails

**Troubleshooting:**
- If generation fails: Check you have at least 1 day of snapshots
- If data is incomplete: Run "Check Now" multiple times over several days
- If errors occur: Check background console for specific error messages

---

### Scenario 4: Test Slack Notification

**Purpose:** Verify weekly Slack notification works

**Steps:**
1. Open background console
2. Run this command:
   ```javascript
   sendWeeklyDashboardNotification();
   ```
3. Check your Slack channel

**What to Check:**
- ✅ Slack receives notification
- ✅ Message includes week date range
- ✅ Shows summary statistics
- ✅ Includes priority items (if any)
- ✅ Provides instructions to view dashboard
- ✅ Dashboard opens automatically in new tab

**Expected Slack Message:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 WEEKLY DEFECT DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Week of Feb 6 to Feb 12

📈 Quick Summary:
• 34 total defects
• 12 untriaged (35%)
...
```

**Troubleshooting:**
- If no Slack message: Verify webhook URL in settings
- If error in console: Check webhook URL is correct
- If message format wrong: This is expected (plain text only)

---

### Scenario 5: Test Monday 11 AM Scheduler

**Purpose:** Verify weekly alarm is set correctly

**Steps:**
1. Open background console
2. Run this command:
   ```javascript
   chrome.alarms.getAll((alarms) => {
     console.log('All alarms:', alarms);
     const weeklyAlarm = alarms.find(a => a.name === 'weeklyDashboard');
     if (weeklyAlarm) {
       const nextRun = new Date(weeklyAlarm.scheduledTime);
       console.log('Weekly dashboard next run:', nextRun.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}));
     }
   });
   ```

**What to Check:**
- ✅ Alarm named "weeklyDashboard" exists
- ✅ Next run is on a Monday
- ✅ Time is 11:00 AM IST
- ✅ periodInMinutes is 10080 (7 days)

**Example Output:**
```
Weekly dashboard next run: Monday, 17/02/2026, 11:00:00 am
```

**Troubleshooting:**
- If no alarm: Extension didn't initialize properly, reload it
- If wrong time: Check timezone settings
- If wrong day: Alarm calculation might have issue

---

### Scenario 6: Test Chart Interactions

**Purpose:** Verify charts are interactive

**Steps:**
1. Open dashboard with data
2. Hover over chart elements

**What to Check:**
- ✅ **Line Chart:** Hover shows exact values for each day
- ✅ **Pie Chart:** Hover shows percentage and count
- ✅ **Bar Chart:** Hover shows component name and count
- ✅ **Comparison Chart:** Hover shows last week vs this week values
- ✅ Charts are responsive (resize browser window)
- ✅ Legend items are clickable (hide/show data)

**Troubleshooting:**
- If charts not interactive: Chart.js didn't load, check internet
- If hover doesn't work: Check browser console for errors
- If charts look broken: Try different browser or clear cache

---

## Complete Test Workflow

### Day 1 (Today) - Initial Setup
```
1. ✅ Reload extension
2. ✅ Check background console for setup messages
3. ✅ Verify weekly alarm is scheduled
4. ✅ Log in to IBM Build Break Report
5. ✅ Click "Check Now" to create first snapshot
6. ✅ Verify data stored in Chrome storage
7. ✅ Click "📊 View Weekly Dashboard"
8. ✅ Verify dashboard displays with 1 day of data
```

### Day 2-7 - Data Accumulation
```
1. ✅ Let daily 10 AM check run automatically
   OR click "Check Now" manually
2. ✅ Check Chrome storage for new daily snapshots
3. ✅ Periodically view dashboard to see data grow
```

### Monday 11 AM - Automatic Dashboard
```
1. ✅ Ensure Chrome is running at 11 AM IST
2. ✅ Dashboard should generate automatically
3. ✅ Slack notification should arrive
4. ✅ Dashboard should open in new tab
5. ✅ Verify all charts show full week of data
```

---

## Manual Testing Commands

### Test in Background Console

Open background console and run these commands:

#### 1. Check Current Configuration
```javascript
chrome.storage.sync.get(null, (config) => {
  console.log('Current config:', config);
});
```

#### 2. Check Daily Snapshots
```javascript
chrome.storage.local.get(['dailySnapshots'], (result) => {
  console.log('Daily snapshots:', result.dailySnapshots);
  if (result.dailySnapshots) {
    console.log('Number of days:', Object.keys(result.dailySnapshots).length);
  }
});
```

#### 3. Check Dashboard Data
```javascript
chrome.storage.local.get(['weeklyDashboardData'], (result) => {
  console.log('Dashboard data:', result.weeklyDashboardData);
});
```

#### 4. Force Generate Dashboard
```javascript
generateWeeklyDashboard().then(() => {
  console.log('Dashboard generated successfully');
}).catch(error => {
  console.error('Dashboard generation failed:', error);
});
```

#### 5. Force Send Slack Notification
```javascript
sendWeeklyDashboardNotification().then(() => {
  console.log('Notification sent successfully');
}).catch(error => {
  console.error('Notification failed:', error);
});
```

#### 6. Check All Alarms
```javascript
chrome.alarms.getAll((alarms) => {
  alarms.forEach(alarm => {
    const nextRun = new Date(alarm.scheduledTime);
    console.log(`${alarm.name}: ${nextRun.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
  });
});
```

#### 7. Manually Trigger Weekly Dashboard
```javascript
chrome.alarms.create('weeklyDashboard', { when: Date.now() + 1000 });
console.log('Weekly dashboard will trigger in 1 second...');
```

---

## Expected Results Summary

### ✅ Success Indicators
- Extension reloads without errors
- Background console shows setup messages
- Weekly alarm is scheduled for Monday 11 AM
- "Check Now" creates daily snapshot
- Dashboard opens and displays data
- Charts are interactive and responsive
- Slack notification sends successfully
- No errors in browser console

### ❌ Common Issues

**Issue 1: "No data available" on dashboard**
- **Cause:** No daily snapshots collected yet
- **Fix:** Click "Check Now" to create first snapshot

**Issue 2: Charts not displaying**
- **Cause:** Chart.js CDN not loading
- **Fix:** Check internet connection, try different network

**Issue 3: Dashboard doesn't open**
- **Cause:** JavaScript error or popup blocker
- **Fix:** Check console for errors, disable popup blocker

**Issue 4: Slack notification not received**
- **Cause:** Webhook URL incorrect or Chrome not running
- **Fix:** Verify webhook URL, ensure Chrome is running at scheduled time

**Issue 5: Weekly alarm not set**
- **Cause:** Extension didn't initialize properly
- **Fix:** Reload extension, check background console

---

## Quick Verification Checklist

Use this checklist to verify everything works:

```
□ Extension reloaded successfully
□ No errors in chrome://extensions/
□ Background console shows setup messages
□ Weekly alarm scheduled for Monday 11 AM
□ "📊 View Weekly Dashboard" button visible in popup
□ Dashboard opens in new tab
□ "Check Now" creates daily snapshot
□ Daily snapshot stored in Chrome storage
□ Dashboard displays data after "Check Now"
□ Charts are interactive (hover works)
□ Slack notification sends successfully
□ Dashboard opens automatically when notification sent
□ No JavaScript errors in console
```

---

## Need Help?

If you encounter issues:

1. **Check Background Console**
   - chrome://extensions/ → Inspect views: service worker
   - Look for error messages

2. **Check Browser Console**
   - Open dashboard → Press F12
   - Look for errors in Console tab

3. **Check Chrome Storage**
   - Press F12 → Application tab → Local Storage
   - Verify dailySnapshots and weeklyDashboardData exist

4. **Check Alarms**
   - Run alarm check command in background console
   - Verify weeklyDashboard alarm exists

5. **Review Documentation**
   - WEEKLY_DASHBOARD_GUIDE.md - Usage guide
   - README.md - General documentation
   - CHANGELOG.md - Recent changes

---

**Happy Testing! 🧪**