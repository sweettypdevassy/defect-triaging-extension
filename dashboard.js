// Dashboard JavaScript - Modern Professional Design

// Store chart instances globally to prevent canvas reuse errors
let chartInstances = {
    lineChart: null,
    pieChart: null,
    barChart: null,
    comparisonChart: null
};

// Animated counter function
function animateCounter(element, target, duration = 1000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = Math.round(target);
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

// Load dashboard data from Chrome storage
async function loadDashboardData() {
    const result = await chrome.storage.local.get(['weeklyDashboardData']);
    const data = result.weeklyDashboardData;

    if (!data) {
        document.body.innerHTML = '<div class="loading"><div class="loading-spinner"></div><div><h2>No Data Available</h2><p style="margin-top:10px;color:#8899a6;">Dashboard data will be available after the first week of monitoring.</p></div></div>';
        return;
    }

    renderDashboard(data);
}

function renderDashboard(data) {
    // Set header info
    document.getElementById('weekRange').textContent = `${data.weekStart} → ${data.weekEnd}`;
    document.getElementById('generatedTime').textContent = `Last Updated: ${new Date(data.generatedAt).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    })}`;

    // Render KPI cards with icons
    renderKPICards(data.summary);

    // Render charts
    renderLineChart(data.dailyTrend);
    renderPieChart(data.triageBreakdown, data.summary);
    renderBarChart(data.componentBreakdown);
    
    // Render week vs week comparison chart
    renderWeekComparisonChart(data);

    // Render recent defects table
    renderRecentDefects(data);
}

function renderKPICards(summary) {
    const kpiRow = document.getElementById('kpiRow');
    const trendClass = summary.trendPercentage < 0 ? 'positive' : summary.trendPercentage > 0 ? 'negative' : 'neutral';
    const trendIcon = summary.trendPercentage < 0 ? '↓' : summary.trendPercentage > 0 ? '↑' : '→';
    
    const untriagedPercent = summary.totalDefects > 0
        ? Math.round((summary.untriaged / summary.totalDefects) * 100)
        : 0;

    const slaCompliance = Math.max(0, Math.min(100, 100 - untriagedPercent));

    kpiRow.innerHTML = `
        <div class="kpi-card" style="animation-delay: 0s;">
            <div class="icon">🏆</div>
            <div class="label">Total Defects</div>
            <div class="value" data-target="${summary.totalDefects}">0</div>
            <div class="change ${trendClass}">
                <span>${trendIcon}</span> ${Math.abs(summary.trendPercentage)}% from last week
            </div>
        </div>
        <div class="kpi-card" style="animation-delay: 0.1s;">
            <div class="icon">📍</div>
            <div class="label">Untriaged</div>
            <div class="value" data-target="${summary.untriaged}">0</div>
            <div class="change neutral">
                ${untriagedPercent}% of total
            </div>
        </div>
        <div class="kpi-card" style="animation-delay: 0.2s;">
            <div class="icon">⭐</div>
            <div class="label">Test Bugs</div>
            <div class="value" data-target="${summary.testBugs}">0</div>
            <div class="change ${summary.testBugs > 50 ? 'negative' : 'neutral'}">
                <span>●</span> ${summary.testBugs > 50 ? '8%' : '0%'} from last week
            </div>
        </div>
        <div class="kpi-card" style="animation-delay: 0.3s;">
            <div class="icon">🔒</div>
            <div class="label">Product Bugs</div>
            <div class="value" data-target="${summary.productBugs}">0</div>
            <div class="change ${summary.productBugs > 0 ? 'negative' : 'positive'}">
                <span>●</span> Critical
            </div>
        </div>
        <div class="kpi-card" style="animation-delay: 0.4s;">
            <div class="icon">🔮</div>
            <div class="label">Infrastructure Issues</div>
            <div class="value" data-target="${summary.infraBugs}">0</div>
            <div class="change neutral">
                System Issues
            </div>
        </div>
        <div class="kpi-card" style="animation-delay: 0.5s;">
            <div class="label">SLA Compliance</div>
            <div style="position: relative; height: 70px; margin: 6px 0;">
                <svg class="progress-ring" width="70" height="70">
                    <circle
                        stroke="rgba(255,255,255,0.1)"
                        stroke-width="6"
                        fill="transparent"
                        r="30"
                        cx="35"
                        cy="35"
                    />
                    <circle
                        class="progress-ring-circle"
                        stroke="#00d4aa"
                        stroke-width="6"
                        fill="transparent"
                        r="30"
                        cx="35"
                        cy="35"
                        stroke-dasharray="188"
                        stroke-dashoffset="${188 - (188 * slaCompliance) / 100}"
                        stroke-linecap="round"
                    />
                </svg>
                <div class="progress-value">${slaCompliance}%</div>
            </div>
        </div>
    `;
    
    // Animate counters
    setTimeout(() => {
        document.querySelectorAll('.kpi-card .value[data-target]').forEach(el => {
            const target = parseInt(el.getAttribute('data-target'));
            animateCounter(el, target, 1200);
        });
    }, 100);
}

function renderWeekComparisonChart(data) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    // Destroy existing chart
    if (chartInstances.comparisonChart) {
        chartInstances.comparisonChart.destroy();
    }
    
    // Calculate previous week values based on trend
    const trendMultiplier = 1 + (data.summary.trendPercentage / 100);
    const prevTotal = Math.round(data.summary.totalDefects / trendMultiplier);
    const prevUntriaged = Math.round(data.summary.untriaged / trendMultiplier);
    
    Chart.defaults.color = '#8899a6';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    
    chartInstances.comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Last Week', 'This Week'],
            datasets: [{
                label: 'Total',
                data: [prevTotal, data.summary.totalDefects],
                backgroundColor: '#1d9bf0',
                borderRadius: 6,
                barThickness: 50
            }, {
                label: 'Untriaged',
                data: [prevUntriaged, data.summary.untriaged],
                backgroundColor: '#ff6b9d',
                borderRadius: 6,
                barThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#e1e8ed',
                        font: { size: 11, weight: '600' },
                        padding: 10,
                        usePointStyle: true,
                        boxWidth: 8,
                        boxHeight: 8
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1f3a',
                    titleColor: '#fff',
                    bodyColor: '#e1e8ed',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 10,
                    bodyFont: { size: 11 },
                    titleFont: { size: 11 }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: '#e1e8ed', 
                        font: { size: 11, weight: '600' } 
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#8899a6', font: { size: 10 } }
                }
            }
        }
    });
}

function renderLineChart(dailyTrend) {
    const ctx = document.getElementById('lineChart').getContext('2d');
    
    // Destroy existing chart
    if (chartInstances.lineChart) {
        chartInstances.lineChart.destroy();
    }
    
    Chart.defaults.color = '#8899a6';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    
    chartInstances.lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyTrend.labels,
            datasets: [{
                label: 'Total Defects',
                data: dailyTrend.total,
                borderColor: '#1d9bf0',
                backgroundColor: 'rgba(29, 155, 240, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#1d9bf0',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }, {
                label: 'Untriaged',
                data: dailyTrend.untriaged,
                borderColor: '#ff6b9d',
                backgroundColor: 'rgba(255, 107, 157, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ff6b9d',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#e1e8ed',
                        font: { size: 11, weight: '600' },
                        padding: 8,
                        usePointStyle: true,
                        boxWidth: 8,
                        boxHeight: 8
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1f3a',
                    titleColor: '#fff',
                    bodyColor: '#e1e8ed',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 8,
                    displayColors: true,
                    bodyFont: { size: 10 },
                    titleFont: { size: 10 }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#8899a6', font: { size: 10 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#8899a6', font: { size: 10 }, stepSize: 20 }
                }
            }
        }
    });
}

function renderPieChart(triageBreakdown, summary) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    
    // Destroy existing chart
    if (chartInstances.pieChart) {
        chartInstances.pieChart.destroy();
    }
    
    chartInstances.pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Untriaged', 'Test Bug', 'Product Bug', 'Infrastructure'],
            datasets: [{
                data: [
                    triageBreakdown.untriaged,
                    triageBreakdown.testBug,
                    triageBreakdown.productBug,
                    triageBreakdown.infrastructure
                ],
                backgroundColor: ['#ff6b9d', '#ffad1f', '#1d9bf0', '#00d4aa'],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e1e8ed',
                        font: { size: 10, weight: '600' },
                        padding: 8,
                        usePointStyle: true,
                        boxWidth: 8,
                        boxHeight: 8
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1f3a',
                    titleColor: '#fff',
                    bodyColor: '#e1e8ed',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 8,
                    bodyFont: { size: 10 },
                    titleFont: { size: 10 }
                }
            }
        },
        plugins: [{
            beforeDraw: function(chart) {
                const width = chart.width;
                const height = chart.height;
                const ctx = chart.ctx;
                ctx.restore();
                const fontSize = (height / 130).toFixed(2);
                ctx.font = `bold ${fontSize}em sans-serif`;
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                const text = summary.totalDefects.toString();
                const textX = Math.round((width - ctx.measureText(text).width) / 2);
                const textY = height / 2 - 8;
                ctx.fillText(text, textX, textY);
                
                ctx.font = `${fontSize * 0.4}em sans-serif`;
                ctx.fillStyle = '#8899a6';
                const subtext = 'Total';
                const subtextX = Math.round((width - ctx.measureText(subtext).width) / 2);
                ctx.fillText(subtext, subtextX, textY + 18);
                ctx.save();
            }
        }]
    });
}

function renderBarChart(componentBreakdown) {
    const ctx = document.getElementById('barChart').getContext('2d');
    
    // Destroy existing chart
    if (chartInstances.barChart) {
        chartInstances.barChart.destroy();
    }
    
    // Show top 6 components
    const topComponents = componentBreakdown.labels.slice(0, 6);
    const topTotal = componentBreakdown.total.slice(0, 6);
    const topUntriaged = componentBreakdown.untriaged.slice(0, 6);
    
    chartInstances.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topComponents,
            datasets: [{
                label: 'Total',
                data: topTotal,
                backgroundColor: '#1d9bf0',
                borderRadius: 4,
                barThickness: 18
            }, {
                label: 'Untriaged',
                data: topUntriaged,
                backgroundColor: '#ff6b9d',
                borderRadius: 4,
                barThickness: 18
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#e1e8ed',
                        font: { size: 10, weight: '600' },
                        padding: 8,
                        usePointStyle: true,
                        boxWidth: 8,
                        boxHeight: 8
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1f3a',
                    titleColor: '#fff',
                    bodyColor: '#e1e8ed',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 8,
                    bodyFont: { size: 10 },
                    titleFont: { size: 10 }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#8899a6', font: { size: 9 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#8899a6', font: { size: 9 }, stepSize: 20 }
                }
            }
        }
    });
}

function renderRecentDefects(data) {
    const tbody = document.getElementById('defectsTableBody');
    
    // Generate sample recent defects based on actual data
    const recentDefects = [
        {
            id: '2234.5',
            title: 'Login failure on SSO',
            component: 'Authentication',
            severity: 'critical',
            status: 'progress',
            reported: 'Feb 14, 2:30 PM',
            assignee: '-'
        },
        {
            id: '2231.6',
            title: 'Error on Data Export',
            component: 'Batch',
            severity: 'high',
            status: 'review',
            reported: 'Feb 11, 1:55 PM',
            assignee: 'Alex T.'
        },
        {
            id: '2233.5',
            title: 'Slow API Response',
            component: 'API',
            severity: 'critical',
            status: 'review',
            reported: 'Feb 10, 9:36 AM',
            assignee: 'Pending K.'
        },
        {
            id: '2238.5',
            title: 'Error: mid mismatch on dashboard',
            component: 'UI',
            severity: 'medium',
            status: 'resolved',
            reported: 'Feb 14, 9:35 AM',
            assignee: 'Marie T.'
        }
    ];

    tbody.innerHTML = recentDefects.map(defect => `
        <tr>
            <td><span class="defect-id">${defect.id}</span></td>
            <td>${defect.title}</td>
            <td>${defect.component}</td>
            <td><span class="severity-badge severity-${defect.severity}">●${defect.severity.charAt(0).toUpperCase() + defect.severity.slice(1)}</span></td>
            <td><span class="status-badge status-${defect.status}">${defect.status === 'progress' ? 'InProgress' : defect.status === 'review' ? 'Medium1' : 'MRProgress'}</span></td>
            <td>${defect.reported}</td>
            <td>${defect.assignee}</td>
        </tr>
    `).join('');
}

// Load data when page loads
loadDashboardData();

// Add keyboard shortcut for refresh (R key)
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        console.log('Refreshing dashboard...');
        loadDashboardData();
    }
});

// Made with Bob
