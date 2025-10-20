function fetchDashboardData() {
    $.get('/api/health', function(data) {
        $('#current-builds').html(`<h2>Current Builds</h2><pre>${JSON.stringify(data.currentBuilds, null, 2)}</pre>`);
        $('#queue-status').html(`<h2>Queue Status</h2><p>${data.queueStatus.waiting} tasks waiting</p>`);
        $('#budget-spend').html(`<h2>Budget Spend</h2><p>$${data.budgetSpend.toFixed(2)}/day</p>`);
        $('#recent-completions').html(`<h2>Recent Completions</h2><pre>${JSON.stringify(data.recentPRs, null, 2)}</pre>`);
        $('#system-health').html(`<h2>System Health</h2><p style='color:${data.systemHealth.color};'>${data.systemHealth.status}</p>`);
        $('#strategic-decisions').html(`<h2>Strategic Decisions Needed</h2>${data.strategicDecisions.map(decision => `<a href='${decision.link}'>${decision.description}</a>`).join('<br>')}`);
    });
}

$(document).ready(function() {
    fetchDashboardData();
    setInterval(fetchDashboardData, 30000);
});
