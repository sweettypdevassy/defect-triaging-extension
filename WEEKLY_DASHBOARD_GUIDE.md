# 📊 Weekly Dashboard Guide

## Overview

The Weekly Dashboard is an interactive analytics tool that provides comprehensive insights into your defect triaging activities. It automatically generates every Monday at 11:00 AM IST and can be accessed anytime through the extension popup.

## Features

### 📈 Interactive Charts
- **Pie Chart** - Triage status distribution (Untriaged, Test Bug, Product Bug, Infrastructure)
- **Line Chart** - Daily defect trend over the last 7 days
- **Bar Chart** - Component-wise comparison
- **Comparison Chart** - Week-over-week analysis

### 📊 Key Metrics
- Total defects for the week
- Untriaged defect count and percentage
- Test bugs, product bugs, infrastructure bugs breakdown
- Trend percentage (up/down from previous week)

### 🎯 Priority Items
Automatically highlights:
- High untriaged counts (>10 defects)
- Increasing trends (>20% increase)
- Components needing attention

### 📦 Component Details
Detailed breakdown for each monitored component:
- Total defects
- Untriaged count
- Test bugs
- Product bugs
- Infrastructure bugs

## How to Access

### Automatic (Recommended)
Every Monday at 11:00 AM IST:
1. Extension generates dashboard data
2. Sends Slack notification with summary
3. Automatically opens dashboard in new Chrome tab

### Manual Access
Anytime you want to view the dashboard:
1. Click the extension icon in Chrome toolbar
2. Click "📊 View Weekly Dashboard" button
3. Dashboard opens in new tab

### Direct URL
You can also bookmark the dashboard URL:
```
chrome-extension://[YOUR-EXTENSION-ID]/dashboard.html
```

## Dashboard Sections

### 1. Header
- Week date range (e.g., "Week of Feb 6 to Feb 12")
- Generation timestamp

### 2. Summary Cards
Six colorful cards showing:
- Total Defects
- Untriaged Count
- Test Bugs
- Trend (with up/down indicator)
- Product Bugs
- Infrastructure Bugs

### 3. Daily Defect Trend
Line chart showing:
- Total defects per day (last 7 days)
- Untriaged defects per day
- Hover over points for exact numbers

### 4. Triage Status Breakdown
Doughnut chart showing:
- Percentage distribution
- Color-coded categories
- Interactive legend

### 5. Component Comparison
Bar chart comparing:
- Total defects per component
- Untriaged defects per component
- Side-by-side comparison

### 6. Week-over-Week Comparison
Bar chart showing:
- Last week vs this week
- Total and untriaged counts
- Visual trend indication

### 7. Priority Items
Alert section highlighting:
- High-priority issues
- Action items
- Recommendations

### 8. Component Details
Detailed cards for each component:
- Component name
- All metrics in one place
- Easy-to-read format

## Data Collection

### Automatic Daily Snapshots
- Extension stores daily defect data automatically
- Runs during the daily 10 AM check
- Keeps last 14 days of data
- No manual intervention needed

### What's Stored
For each day:
- Date
- Total defects
- Untriaged count
- Test bugs count
- Product bugs count
- Infrastructure bugs count
- Component-wise breakdown

### Storage Location
- Chrome local storage (not synced)
- Private to your browser
- Never sent to external servers
- Automatically cleaned (keeps last 14 days)

## Slack Notification

### Notification Content
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 WEEKLY DEFECT DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Week of Feb 6 to Feb 12

📈 Quick Summary:
• 34 total defects
• 12 untriaged (35%)
• 15 test bugs
• 5 product bugs
• 2 infrastructure bugs
• Trending: ↘️ Down 15% from last week

🎯 Priority Items:
• High Untriaged Count: 12 defects need attention

🔗 VIEW FULL DASHBOARD
Click the extension icon and select "View Weekly Dashboard"
Or open: chrome-extension://[id]/dashboard.html

The dashboard includes:
✨ Interactive charts and graphs
📊 Detailed analytics
📈 Daily trend analysis
📦 Component breakdown
📉 Week-over-week comparison

Generated: Monday, Feb 13, 2026 at 11:00 AM IST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### When Sent
- Every Monday at 11:00 AM IST
- Automatically after dashboard generation
- Uses your configured Slack webhook

## Customization

### Change Dashboard Schedule
Currently fixed to Monday 11:00 AM IST. To change:
1. Edit `background.js`
2. Find `setupWeeklyDashboardAlarm()` function
3. Modify the day/time calculation
4. Reload extension

### Add More Metrics
To add custom metrics:
1. Edit `generateWeeklyDashboard()` in `background.js`
2. Add your metric calculation
3. Update `dashboard.html` to display it
4. Reload extension

## Troubleshooting

### Dashboard Shows "No data available"
**Cause:** Not enough daily snapshots collected yet
**Solution:** 
- Wait for at least one daily check to run
- Or click "Check Now" in extension popup
- Dashboard needs at least 1 day of data

### Charts Not Displaying
**Cause:** Chart.js library not loading
**Solution:**
- Check internet connection (Chart.js loads from CDN)
- Open browser console (F12) for errors
- Reload the dashboard page

### Old Data Showing
**Cause:** Dashboard not regenerated
**Solution:**
- Click "📊 View Weekly Dashboard" button again
- This regenerates dashboard with latest data
- Or wait for next Monday 11 AM

### Slack Notification Not Received
**Cause:** Webhook URL issue or Chrome not running
**Solution:**
- Verify webhook URL in settings
- Ensure Chrome is running on Monday 11 AM
- Check extension is enabled
- Test with "Check Now" button

## Best Practices

### 1. Keep Chrome Running
- Dashboard generates only when Chrome is running
- Consider enabling Chrome to run in background
- Or ensure Chrome is open Monday mornings

### 2. Regular Monitoring
- Check dashboard weekly
- Look for trends and patterns
- Act on priority items

### 3. Share with Team
- Dashboard URL can be shared
- Take screenshots for reports
- Use data for team meetings

### 4. Data Accuracy
- Ensure daily checks run successfully
- Monitor "Last Check" time in popup
- Fix any login issues promptly

## Technical Details

### Technologies Used
- **Chart.js 4.4.0** - Interactive charts
- **Chrome Storage API** - Data persistence
- **Chrome Alarms API** - Scheduling
- **Vanilla JavaScript** - No frameworks

### Performance
- Dashboard loads instantly (local data)
- Charts render in <1 second
- Minimal memory usage
- No external API calls for display

### Browser Compatibility
- Chrome (recommended)
- Edge (Chromium-based)
- Brave
- Other Chromium browsers

## Privacy & Security

### Data Privacy
- ✅ All data stored locally in Chrome
- ✅ No external servers
- ✅ No data transmission (except Slack notification)
- ✅ No tracking or analytics
- ✅ Data automatically cleaned after 14 days

### Security
- ✅ Uses browser's existing authentication
- ✅ No credentials stored
- ✅ Webhook URL encrypted in Chrome storage
- ✅ No third-party scripts (except Chart.js CDN)

## FAQ

**Q: Can I export dashboard data?**
A: Currently no built-in export. You can take screenshots or print the page (Ctrl+P).

**Q: Can I change the week start day?**
A: Yes, edit the `generateWeeklyDashboard()` function in `background.js`.

**Q: How much storage does it use?**
A: Minimal - approximately 50KB for 14 days of data.

**Q: Can I view historical dashboards?**
A: Currently only shows last 7 days. Historical data is kept for 14 days but not displayed.

**Q: Does it work offline?**
A: Dashboard displays offline, but Chart.js requires internet to load initially.

**Q: Can I customize chart colors?**
A: Yes, edit the chart configuration in `dashboard.html`.

## Support

For issues or questions:
1. Check this guide
2. Review browser console (F12) for errors
3. Verify extension is enabled
4. Check Chrome storage for data
5. Test with "Check Now" button

---

**Made with ❤️ for better defect triaging insights**