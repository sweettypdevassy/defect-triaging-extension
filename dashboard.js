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
    
    // Check if we have last week data
    const hasLastWeekData = data.weekComparison &&
                           data.weekComparison.lastWeek &&
                           data.weekComparison.lastWeek.total > 0;
    
    Chart.defaults.color = '#8899a6';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    
    // If no last week data, show only this week
    const labels = hasLastWeekData ? ['Last Week', 'This Week'] : ['This Week'];
    const totalData = hasLastWeekData
        ? [data.weekComparison.lastWeek.total, data.summary.totalDefects]
        : [data.summary.totalDefects];
    const untriagedData = hasLastWeekData
        ? [data.weekComparison.lastWeek.untriaged, data.summary.untriaged]
        : [data.summary.untriaged];
    
    chartInstances.comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total',
                data: totalData,
                backgroundColor: '#1d9bf0',
                borderRadius: 6,
                barThickness: 50
            }, {
                label: 'Untriaged',
                data: untriagedData,
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
    
    // Show all components (no limit)
    const components = componentBreakdown.labels || [];
    
    // Check if we have the new detailed breakdown, otherwise use old format
    const hasDetailedBreakdown = componentBreakdown.testBugs && componentBreakdown.testBugs.length > 0;
    
    let untriaged, testBugs, productBugs, infraBugs;
    
    if (hasDetailedBreakdown) {
        // New format with detailed breakdown
        untriaged = componentBreakdown.untriaged || [];
        testBugs = componentBreakdown.testBugs || [];
        productBugs = componentBreakdown.productBugs || [];
        infraBugs = componentBreakdown.infraBugs || [];
    } else {
        // Old format - show total and untriaged only
        const total = componentBreakdown.total || [];
        untriaged = componentBreakdown.untriaged || [];
        // Calculate triaged as total - untriaged
        testBugs = total.map((t, i) => Math.max(0, t - (untriaged[i] || 0)));
        productBugs = [];
        infraBugs = [];
    }
    
    chartInstances.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: components,
            datasets: [{
                label: 'Untriaged',
                data: untriaged,
                backgroundColor: '#ff6b9d',
                borderRadius: 4,
                barThickness: 15
            }, {
                label: 'Test Bugs',
                data: testBugs,
                backgroundColor: '#ffad1f',
                borderRadius: 4,
                barThickness: 15
            }, {
                label: 'Product Bugs',
                data: productBugs,
                backgroundColor: '#1d9bf0',
                borderRadius: 4,
                barThickness: 15
            }, {
                label: 'Infrastructure',
                data: infraBugs,
                backgroundColor: '#00d4aa',
                borderRadius: 4,
                barThickness: 15
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
                    ticks: { color: '#8899a6', font: { size: 9 } }
                }
            }
        }
    });
}

function renderRecentDefects(data) {
    const tbody = document.getElementById('defectsTableBody');
    
    // TODO: Fetch real defects from Jazz/RTC system
    // URL: https://wasrtc.hursley.ibm.com:9443/jazz/web/projects/WS-CD#action=com.ibm.team.workitem.runSavedQuery&id=_fJ834OXIEemRB5enIPF1MQ
    // For now, showing placeholder data with correct structure
    
    const soeTriageDefects = [
        {
            id: '123456',
            summary: 'Defect needs triage - overdue',
            functionalArea: 'JPA',
            filedAgainst: 'WebSphere Application Server',
            creationDate: 'Feb 10, 2026',
            ownedBy: 'Unassigned'
        },
        {
            id: '123457',
            summary: 'Critical issue requiring immediate triage',
            functionalArea: 'Spring Boot',
            filedAgainst: 'Liberty Runtime',
            creationDate: 'Feb 12, 2026',
            ownedBy: 'John Doe'
        },
        {
            id: '123458',
            summary: 'Performance degradation - needs investigation',
            functionalArea: 'JCA',
            filedAgainst: 'Resource Adapter',
            creationDate: 'Feb 13, 2026',
            ownedBy: 'Jane Smith'
        }
    ];

    if (soeTriageDefects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px; color: #8899a6;">
                    No overdue SOE triage defects found
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = soeTriageDefects.map(defect => `
            <tr>
                <td><span class="defect-id">${defect.id}</span></td>
                <td>${defect.summary}</td>
                <td>${defect.functionalArea}</td>
                <td>${defect.filedAgainst}</td>
                <td>${defect.creationDate}</td>
                <td>${defect.ownedBy}</td>
            </tr>
        `).join('');
    }
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
