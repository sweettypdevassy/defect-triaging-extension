# Changelog

All notable changes to the Defect Triaging Extension.

## [2.0.0] - 2026-02-13

### 🎉 Major Feature: Weekly Dashboard

#### Added
- **Interactive Weekly Dashboard** - Beautiful analytics dashboard with Chart.js
  - Opens automatically every Monday at 11:00 AM IST
  - Can be accessed anytime via extension popup button
  - Displays comprehensive defect analytics for the past week

#### Dashboard Features
- 📊 **Interactive Charts**
  - Pie chart for triage status breakdown
  - Line chart for daily defect trends
  - Bar chart for component comparison
  - Week-over-week comparison chart
  
- 📈 **Analytics**
  - Total defects, untriaged count, test bugs, product bugs, infrastructure bugs
  - Trend percentage (up/down from previous week)
  - Priority items highlighting
  - Component-wise detailed breakdown

- 🎯 **Automatic Insights**
  - Highlights high untriaged counts
  - Identifies increasing trends
  - Suggests action items

#### Technical Implementation
- **Daily Data Collection**
  - Automatically stores daily defect snapshots
  - Keeps last 14 days of data in Chrome local storage
  - No external storage or servers
  
- **Weekly Scheduler**
  - New alarm for Monday 11:00 AM IST
  - Generates dashboard data automatically
  - Sends Slack notification with summary
  - Opens dashboard in new Chrome tab

- **New Files**
  - `dashboard.html` - Interactive dashboard UI (485 lines)
  - `WEEKLY_DASHBOARD_GUIDE.md` - Comprehensive usage guide (329 lines)
  - `CHANGELOG.md` - This file

#### Updated Files
- `background.js` - Added 500+ lines for dashboard functionality
  - `setupWeeklyDashboardAlarm()` - Schedule Monday 11 AM checks
  - `storeDailySnapshot()` - Store daily defect data
  - `generateWeeklyDashboard()` - Generate dashboard analytics
  - `sendWeeklyDashboardNotification()` - Send Slack notification
  - Updated `checkDefects()` to store daily snapshots
  - Added message handlers for dashboard actions

- `popup.html` - Added "📊 View Weekly Dashboard" button
- `popup.js` - Added `openDashboard()` function
- `README.md` - Updated with weekly dashboard features
- `INSTALLATION.md` - (No changes needed)

#### Slack Integration
- Weekly summary notification every Monday 11 AM
- Includes quick stats and link to full dashboard
- Same webhook as daily notifications

#### User Experience
- **Zero Configuration** - Works automatically after extension is installed
- **One-Click Access** - View dashboard anytime from popup
- **Privacy-Focused** - All data stored locally, never sent to external servers
- **Beautiful UI** - Professional gradient design with hover effects

### Technical Details
- Uses Chart.js 4.4.0 from CDN for interactive charts
- Responsive design works on all screen sizes
- Print-friendly for reports
- Minimal performance impact
- ~50KB storage for 14 days of data

---

## [1.0.0] - 2026-02-12

### Initial Release

#### Features
- ✅ Automatic daily defect checks at 10:00 AM IST
- ✅ Slack notifications for untriaged defects
- ✅ Multi-component support (comma-separated)
- ✅ Browser-based authentication (uses existing IBM session)
- ✅ Session keepalive (every 2 hours)
- ✅ Auto-retry on login errors (every 1 minute)
- ✅ Manual "Check Now" trigger
- ✅ Configurable settings page
- ✅ Extension popup with status display

#### Files
- `manifest.json` - Extension configuration
- `background.js` - Background service worker (500 lines)
- `popup.html` - Extension popup UI
- `popup.js` - Popup functionality
- `options.html` - Settings page UI
- `options.js` - Settings functionality
- `README.md` - Documentation
- `INSTALLATION.md` - Installation guide

#### Technical Implementation
- Chrome Extension Manifest V3
- Chrome Alarms API for scheduling
- Chrome Storage API for configuration
- Fetch API with credentials for IBM authentication
- Slack Webhook integration

---

## Upgrade Instructions

### From v1.0.0 to v2.0.0

1. **Backup Settings** (Optional)
   - Your settings are preserved automatically
   - Webhook URL, components, and check time remain unchanged

2. **Update Extension**
   - Go to `chrome://extensions/`
   - Click refresh icon on the extension
   - Or remove and reload the extension folder

3. **Verify Update**
   - Click extension icon
   - You should see new "📊 View Weekly Dashboard" button
   - Check console for "Setting up weekly dashboard..." message

4. **First Dashboard**
   - Dashboard will generate automatically next Monday 11 AM
   - Or click "📊 View Weekly Dashboard" to view immediately
   - Note: First dashboard may have limited data until daily snapshots accumulate

5. **No Configuration Needed**
   - Weekly dashboard uses existing settings
   - Same Slack webhook for notifications
   - No additional setup required

---

## Future Enhancements (Planned)

### v2.1.0
- [ ] Export dashboard to PDF
- [ ] Email dashboard option
- [ ] Custom date range selection
- [ ] More chart types (gauge, radar)

### v2.2.0
- [ ] Historical dashboard archive
- [ ] Defect aging analysis
- [ ] Team performance metrics
- [ ] Custom alert thresholds

### v3.0.0
- [ ] GitHub Pages hosting option
- [ ] Shareable dashboard links
- [ ] Team collaboration features
- [ ] Advanced filtering and search

---

## Known Issues

### v2.0.0
- Dashboard requires internet connection for Chart.js CDN
- First week may show incomplete data (needs 7 days of snapshots)
- Chrome must be running on Monday 11 AM for automatic dashboard

### Workarounds
- **Chart.js offline**: Download Chart.js and include locally
- **Incomplete data**: Click "Check Now" daily to build history faster
- **Missed Monday**: Click "📊 View Weekly Dashboard" anytime to generate

---

## Support

For issues, questions, or feature requests:
1. Check `WEEKLY_DASHBOARD_GUIDE.md` for dashboard help
2. Check `README.md` for general documentation
3. Check `INSTALLATION.md` for setup help
4. Review browser console (F12) for errors

---

**Made with ❤️ for automated defect triaging**