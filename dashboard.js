// Dashboard JavaScript - separated from HTML for CSP compliance

// Load dashboard data from Chrome storage
async function loadDashboardData() {
    const result = await chrome.storage.local.get(['weeklyDashboardData']);
    const data = result.weeklyDashboardData;

    if (!data) {
        document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h1>No data available</h1><p>Dashboard data will be available after the first week of monitoring.</p></div>';
        return;
    }

    renderDashboard(data);
}

function renderDashboard(data) {
    // Set week range
    document.getElementById('weekRange').textContent = `Week of ${data.weekStart} to ${data.weekEnd}`;
    document.getElementById('generatedTime').textContent = new Date(data.generatedAt).toLocaleString();

    // Render stats cards
    renderStatsCards(data.summary);

    // Render charts
    renderLineChart(data.dailyTrend);
    renderPieChart(data.triageBreakdown);
    renderBarChart(data.componentBreakdown);
    renderComparisonChart(data.weekComparison);

    // Render priority items
    renderPriorityItems(data.priorityItems);

    // Render component details
    renderComponentDetails(data.componentDetails);
}

function renderStatsCards(summary) {
    const statsGrid = document.getElementById('statsGrid');
    const trendClass = summary.trendPercentage < 0 ? 'trend-up' : 'trend-down';
    const trendIcon = summary.trendPercentage < 0 ? '↘️' : '↗️';

    statsGrid.innerHTML = `
        <div class="stat-card">
            <h3>${summary.totalDefects}</h3>
            <p>Total Defects</p>
        </div>
        <div class="stat-card">
            <h3>${summary.untriaged}</h3>
            <p>Untriaged</p>
        </div>
        <div class="stat-card">
            <h3>${summary.testBugs}</h3>
            <p>Test Bugs</p>
        </div>
        <div class="stat-card ${trendClass}">
            <h3>${trendIcon} ${Math.abs(summary.trendPercentage)}%</h3>
            <p>Trend</p>
        </div>
        <div class="stat-card">
            <h3>${summary.productBugs}</h3>
            <p>Product Bugs</p>
        </div>
        <div class="stat-card">
            <h3>${summary.infraBugs}</h3>
            <p>Infrastructure</p>
        </div>
    `;
}

function renderLineChart(dailyTrend) {
    const ctx = document.getElementById('lineChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyTrend.labels,
            datasets: [{
                label: 'Total Defects',
                data: dailyTrend.total,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Untriaged',
                data: dailyTrend.untriaged,
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderPieChart(triageBreakdown) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    new Chart(ctx, {
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
                backgroundColor: [
                    '#ff6384',
                    '#ffcd56',
                    '#4bc0c0',
                    '#36a2eb'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderBarChart(componentBreakdown) {
    const ctx = document.getElementById('barChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: componentBreakdown.labels,
            datasets: [{
                label: 'Total',
                data: componentBreakdown.total,
                backgroundColor: '#764ba2'
            }, {
                label: 'Untriaged',
                data: componentBreakdown.untriaged,
                backgroundColor: '#ff6384'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderComparisonChart(weekComparison) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Last Week', 'This Week'],
            datasets: [{
                label: 'Total Defects',
                data: [weekComparison.lastWeek.total, weekComparison.thisWeek.total],
                backgroundColor: '#667eea'
            }, {
                label: 'Untriaged',
                data: [weekComparison.lastWeek.untriaged, weekComparison.thisWeek.untriaged],
                backgroundColor: '#ff6384'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderPriorityItems(priorityItems) {
    const priorityList = document.getElementById('priorityList');
    if (priorityItems.length === 0) {
        priorityList.innerHTML = '<p>No priority items this week! 🎉</p>';
        return;
    }

    priorityList.innerHTML = priorityItems.map(item => `
        <div class="priority-item">
            <strong>${item.title}</strong>
            <p>${item.description}</p>
        </div>
    `).join('');
}

function renderComponentDetails(componentDetails) {
    const componentList = document.getElementById('componentList');
    componentList.innerHTML = componentDetails.map(component => `
        <div class="component-item">
            <h3>${component.name}</h3>
            <div class="component-stats">
                <div class="component-stat">
                    Total: <span>${component.total}</span>
                </div>
                <div class="component-stat">
                    Untriaged: <span>${component.untriaged}</span>
                </div>
                <div class="component-stat">
                    Test Bugs: <span>${component.testBugs}</span>
                </div>
                <div class="component-stat">
                    Product Bugs: <span>${component.productBugs}</span>
                </div>
                <div class="component-stat">
                    Infrastructure: <span>${component.infrastructure}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Load data when page loads
loadDashboardData();

// Made with Bob
