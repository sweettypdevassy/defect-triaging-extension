# Dashboard Data Explanation

## Overview
The Weekly Dashboard collects defect data **once per day at 10 AM IST** (when the daily check runs) and stores it for 7 days. Every Monday at 11 AM IST, it generates a comprehensive analytics dashboard.

---

## 📊 Dashboard Sections Explained

### 1. Summary Cards (Top Row)

#### **Total Defects This Week**
- **What it shows**: Sum of ALL defects found across all 7 days
- **Calculation**: Adds up (untriaged + triaged) defects from each day
- **Example**: 
  - Monday: 5 defects
  - Tuesday: 7 defects
  - Wednesday: 6 defects
  - ...Sunday: 4 defects
  - **Total = 5+7+6+...+4 = 45 defects**

#### **Average Daily Defects**
- **What it shows**: Average number of defects per day
- **Calculation**: Total defects ÷ 7 days
- **Example**: 45 total defects ÷ 7 days = **6.4 defects/day**
- **Purpose**: Shows typical daily defect load

#### **Untriaged Defects**
- **What it shows**: Current number of defects that need triage
- **Source**: Latest day's untriaged count (most recent data)
- **Example**: If Sunday has 3 untriaged defects, shows **3**
- **Purpose**: Shows current backlog requiring attention

#### **Week-over-Week Change**
- **What it shows**: Percentage change compared to previous week
- **Calculation**: ((This week total - Last week total) / Last week total) × 100
- **Example**: 
  - Last week: 40 defects
  - This week: 45 defects
  - Change: ((45-40)/40) × 100 = **+12.5%** ⬆️
- **Colors**:
  - 🟢 Green (negative %): Fewer defects than last week (good!)
  - 🔴 Red (positive %): More defects than last week (needs attention)

---

### 2. Daily Defect Trend (Line Chart)

#### **What it shows**
A line graph showing how defect counts changed each day of the week.

#### **Data Points**
- **X-axis**: Days of the week (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- **Y-axis**: Number of defects
- **Line**: Connects daily defect counts

#### **Example Interpretation**
```
Mon: 5 defects
Tue: 7 defects (spike - investigate!)
Wed: 6 defects
Thu: 4 defects (improving)
Fri: 8 defects (another spike)
Sat: 3 defects (weekend drop)
Sun: 4 defects
```

#### **What to look for**
- **Spikes**: Days with unusually high defects (may indicate build issues)
- **Trends**: Is it increasing or decreasing over the week?
- **Patterns**: Do defects spike on certain days (e.g., after deployments)?

---

### 3. Triage Status Breakdown (Pie Chart)

#### **What it shows**
Distribution of defects by their triage status across the entire week.

#### **Categories**

##### 🔴 **Untriaged** (Red)
- Defects with tag: `["triaging"]`
- Not yet categorized
- **Requires immediate attention**

##### 🟡 **Test Bug** (Yellow)
- Defects with tags: `test_bug`, `testbug`, `test-bug`
- Issues in test code/framework
- **Owned by test team**

##### 🟠 **Infrastructure Bug** (Orange)
- Defects with tags: `infrastructure_bug`, `infrastructurebug`, `infrastructure-bug`, `infra_bug`
- Environment/infrastructure issues
- **Owned by infrastructure team**

##### 🔵 **Product Bug** (Blue)
- Defects with tags: `product_bug`, `productbug`, `product-bug`
- Issues in product code
- **Owned by development team**

#### **Example**
```
Total: 45 defects
- Untriaged: 8 (18%) - Need triage
- Test Bug: 15 (33%) - Test team
- Infrastructure: 10 (22%) - Infra team
- Product Bug: 12 (27%) - Dev team
```

#### **What to look for**
- **High untriaged %**: Triage backlog building up
- **Category distribution**: Which team has most issues?

---

### 4. Component Breakdown (Bar Chart)

#### **What it shows**
Defect counts for each component you're monitoring.

#### **Data**
- **X-axis**: Component names (e.g., Messaging, Database, Security)
- **Y-axis**: Number of defects
- **Bars**: Height shows defect count

#### **Example**
```
Messaging: 25 defects (highest)
Database: 12 defects
Security: 8 defects (lowest)
```

#### **What to look for**
- **Hotspots**: Components with most defects need attention
- **Comparison**: Which component is most/least stable?

---

### 5. Week-over-Week Comparison (Grouped Bar Chart)

#### **What it shows**
Side-by-side comparison of this week vs last week for each component.

#### **Data**
- **Blue bars**: Last week's defect count
- **Green bars**: This week's defect count
- **Side-by-side**: Easy visual comparison

#### **Example**
```
Messaging:
  Last Week: 30 defects (blue bar)
  This Week: 25 defects (green bar)
  → Improvement! 5 fewer defects

Database:
  Last Week: 8 defects (blue bar)
  This Week: 12 defects (green bar)
  → Regression! 4 more defects
```

#### **What to look for**
- **Green bar shorter than blue**: Improvement ✅
- **Green bar taller than blue**: Regression ⚠️
- **Similar heights**: Stable

---

### 6. Priority Items (Table)

#### **What it shows**
Top 5 defects that need immediate attention.

#### **Columns**

##### **Component**
Which functional area the defect belongs to

##### **Defect Count**
Number of defects for this component

##### **Status**
Current triage status (Untriaged, Test Bug, etc.)

##### **Trend**
Week-over-week change
- ⬆️ Red: Increasing defects
- ⬇️ Green: Decreasing defects
- ➡️ Gray: No change

#### **Sorting**
Sorted by defect count (highest first)

#### **Example**
```
1. Messaging | 25 defects | Untriaged | ⬆️ +5
2. Database  | 12 defects | Product Bug | ⬇️ -2
3. Security  | 8 defects  | Test Bug | ➡️ 0
```

---

## 📅 Data Collection Schedule

### Daily Collection (10 AM IST)
- Extension runs daily defect check
- Stores snapshot with:
  - Date
  - Component name
  - Total defects
  - Untriaged count
  - Triaged count (by category)
  - Individual defect details

### Weekly Dashboard (Monday 11 AM IST)
- Aggregates last 7 days of data
- Generates all charts and metrics
- Sends Slack notification
- Opens dashboard in browser

### Data Retention
- Keeps 7 days of snapshots
- Older data automatically removed
- Always shows most recent week

---

## 🎯 How to Use This Data

### For Daily Monitoring
1. Check **Untriaged Defects** card - your daily backlog
2. Review **Daily Trend** - spot unusual spikes
3. Check Slack notifications at 10 AM

### For Weekly Planning
1. Review **Week-over-Week Change** - overall health
2. Check **Component Breakdown** - identify problem areas
3. Review **Priority Items** - plan triage sessions
4. Compare **Week-over-Week Chart** - track improvements

### For Team Meetings
1. Show **Triage Status Pie Chart** - workload distribution
2. Discuss **Priority Items** - assign owners
3. Review **Trends** - celebrate improvements, address regressions

---

## 🔍 Example Scenario

**Dashboard shows:**
- Total: 45 defects this week
- Average: 6.4 defects/day
- Untriaged: 8 defects (current)
- Week-over-Week: +12.5% ⬆️ (red)

**Daily Trend shows:**
- Tuesday spike: 12 defects (highest)
- Friday spike: 10 defects
- Weekend: 3-4 defects (normal)

**Triage Status:**
- 18% Untriaged (8 defects)
- 33% Test Bugs (15 defects)
- 27% Product Bugs (12 defects)

**Component Breakdown:**
- Messaging: 25 defects (highest)
- Database: 12 defects
- Security: 8 defects

**Interpretation:**
1. ⚠️ Defects increased 12.5% from last week
2. 🔴 Messaging component needs attention (25 defects)
3. 📈 Tuesday and Friday show spikes (check deployments)
4. ✅ Only 18% untriaged (good triage rate)
5. 🎯 Focus: Triage 8 untriaged defects, investigate Messaging component

**Action Items:**
- Schedule triage session for 8 untriaged defects
- Investigate Messaging component (25 defects)
- Review Tuesday/Friday deployments (spike correlation)
- Test team to review 15 test bugs