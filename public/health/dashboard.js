async function fetchHealthData() {
    const response = await fetch('/api/health');
    const data = await response.json();
    updateDashboard(data);
}

function updateDashboard(data) {
    document.getElementById('builds-list').innerHTML = data.currentBuilds.join('<br>');
    document.getElementById('queue-count').innerText = `${data.queueStatus} tasks waiting`;
    document.getElementById('spend-amount').innerText = `$${data.budgetSpend}/day`;
    const prList = document.getElementById('pr-list');
    prList.innerHTML = '';
    data.recentCompletions.forEach(pr => {
        const li = document.createElement('li');
        li.innerText = pr;
        prList.appendChild(li);
    });
    const healthStatus = document.getElementById('health-status');
    healthStatus.className = data.systemHealth;
    healthStatus.innerText = data.systemHealth.charAt(0).toUpperCase() + data.systemHealth.slice(1);
    const decisionsList = document.getElementById('decisions-list');
    decisionsList.innerHTML = '';
    data.strategicDecisions.forEach(decision => {
        const link = document.createElement('a');
        link.href = decision.link;
        link.innerText = decision.title;
        decisionsList.appendChild(link);
        decisionsList.appendChild(document.createElement('br'));
    });
}

setInterval(fetchHealthData, 30000);
fetchHealthData();