# Data Collection Timing - Detailed Explanation

## 🕐 When Does Data Collection Happen?

### **ANSWER: Data is collected at 10:00 AM IST every day**

---

## 📅 Complete Timeline

### Daily Schedule (Every Day)

#### **10:00 AM IST - Daily Defect Check**
This is when ALL data collection happens:

1. **Alarm Triggers**
   - Chrome alarm named `dailyDefectCheck` fires at 10:00 AM IST
   - Configured in `setupDailyAlarm()` function

2. **Defect Check Runs** (`checkDefects()` function)
   - Fetches defects from IBM API for all configured components
   - Filters untriaged defects
   - Sends Slack notification with untriaged defects

3. **Data Snapshot Stored** (`storeDailySnapshot()` function)
   - **This happens IMMEDIATELY after the defect check**
   - Stores a snapshot with:
     - Date (YYYY-MM-DD format)
     - Component name
     - Total defects count
     - Untriaged count
     - Test bugs count
     - Product bugs count
     - Infrastructure bugs count
     - Individual defect details

**Key Point**: Data collection is NOT separate from the daily check. It happens as part of the same 10 AM process.

---

### Weekly Schedule (Every Monday)

#### **11:00 AM IST - Weekly Dashboard Generation**
This is when the dashboard is created from collected data:

1. **Alarm Triggers**
   - Chrome alarm named `weeklyDashboard` fires at 11:00 AM IST on Mondays
   - Configured in `setupWeeklyDashboardAlarm()` function

2. **Dashboard Generation** (`generateWeeklyDashboard()` function)
   - Reads the last 7 days of stored snapshots
   - Calculates all metrics and charts
   - Generates dashboard HTML

3. **Slack Notification Sent**
   - Sends summary to Slack
   - Opens dashboard in browser

**Key Point**: The dashboard does NOT collect new data. It only analyzes the data that was already collected during the daily 10 AM checks.

---

## 🔄 Data Collection Flow

```
Day 1 (Monday):
├─ 10:00 AM IST
│  ├─ Check defects from IBM API
│  ├─ Send Slack notification (untriaged defects)
│  └─ Store snapshot for Monday
│
└─ 11:00 AM IST (Monday only)
   ├─ Read last 7 days of snapshots
   ├─ Generate dashboard
   └─ Send dashboard to Slack

Day 2 (Tuesday):
├─ 10:00 AM IST
│  ├─ Check defects from IBM API
│  ├─ Send Slack notification (untriaged defects)
│  └─ Store snapshot for Tuesday
│
└─ (No dashboard generation)

Day 3 (Wednesday):
├─ 10:00 AM IST
│  ├─ Check defects from IBM API
│  ├─ Send Slack notification (untriaged defects)
│  └─ Store snapshot for Wednesday
│
└─ (No dashboard generation)

... and so on for Thursday, Friday, Saturday, Sunday

Day 8 (Next Monday):
├─ 10:00 AM IST
│  ├─ Check defects from IBM API
│  ├─ Send Slack notification (untriaged defects)
│  └─ Store snapshot for Monday
│
└─ 11:00 AM IST (Monday only)
   ├─ Read last 7 days of snapshots (Tue-Mon)
   ├─ Generate dashboard
   └─ Send dashboard to Slack
```

---

## 📊 What Data is Collected at 10 AM?

### For Each Component:

1. **API Call Made**
   ```
   GET https://libh-proxy1.fyre.ibm.com/buildBreakReport/rest2/defects/buildbreak/fas?fas=ComponentName
   ```

2. **Data Retrieved**
   - All defects for the component
   - Each defect includes:
     - ID
     - Summary
     - State (Open/Closed)
     - Owner
     - Triage tags
     - Number of reported builds
     - Functional area

3. **Data Processed**
   - Categorizes each defect:
     - **Untriaged**: No triage tags (test_bug, product_bug, infrastructure_bug)
     - **Test Bug**: Has test_bug tag
     - **Product Bug**: Has product_bug tag
     - **Infrastructure Bug**: Has infrastructure_bug tag

4. **Snapshot Stored**
   ```javascript
   {
     date: "2026-02-13",
     component: "Messaging",
     totalDefects: 25,
     untriaged: 8,
     testBugs: 10,
     productBugs: 5,
     infraBugs: 2,
     defects: [
       { id: "307249", summary: "Test failure...", ... },
       { id: "307053", summary: "Test failure...", ... },
       ...
     ]
   }
   ```

---

## ⏰ Time Zone Details

### Configuration
- **Default Time**: 10:00 AM IST (India Standard Time)
- **Time Zone**: Asia/Calcutta (UTC+5:30)
- **Configurable**: Yes, can be changed in extension settings

### How It Works
```javascript
// From background.js line 7
checkTime: '10:00'  // 24-hour format

// Alarm setup converts to IST
const [hours, minutes] = config.checkTime.split(':');
const now = new Date();
const scheduledTime = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate(),
  parseInt(hours),
  parseInt(minutes),
  0
);
```

---

## 🎯 Summary

### Question: "Which time data is the dashboard collecting?"

### Answer:
**The dashboard collects data at 10:00 AM IST every day.**

- ✅ Data collection happens ONCE per day at 10 AM IST
- ✅ Collection is automatic (Chrome alarm triggers it)
- ✅ Same time as the daily Slack notification
- ✅ Dashboard (Monday 11 AM) uses this pre-collected data
- ✅ No separate data collection for the dashboard

### Manual Collection
You can also trigger data collection manually:
- Click "Check Now" button in extension popup
- Click "Test Now" button in settings
- Both will collect data immediately (regardless of time)

---

## 📝 Code References

### Daily Alarm Setup
```javascript
// background.js line 40-80
async function setupDailyAlarm() {
  const config = await getConfig();
  const [hours, minutes] = config.checkTime.split(':'); // "10:00"
  // ... creates alarm for 10:00 AM IST
}
```

### Data Collection
```javascript
// background.js line 259
async function checkDefects() {
  // ... fetches defects from API
  // ... sends Slack notification
  await storeDailySnapshot(componentDefectsMap, totalDefects); // line 342
}
```

### Snapshot Storage
```javascript
// background.js line 572
async function storeDailySnapshot(componentDefectsMap, totalDefects) {
  const today = new Date().toISOString().split('T')[0]; // Current date
  // ... stores snapshot with today's date
}
```

### Weekly Dashboard
```javascript
// background.js line 850
async function setupWeeklyDashboardAlarm() {
  // ... creates alarm for Monday 11:00 AM IST
  // ... reads pre-collected snapshots
  // ... does NOT collect new data
}