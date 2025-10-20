const cron = require('node-cron');
const smsAlerts = require('../services/sms-alerts');
const db = require('../db');
const fetch = require('node-fetch');

const RAILWAY_API_URL = 'https://api.railway.app/deployment/status';
const CHECK_INTERVAL = 15; // in minutes

async function checkHealth() {
    const claimedTasksCount = await db.query('SELECT COUNT(*) as count FROM orch_tasks WHERE status = ?', ['claimed']);
    const queueDepth = await db.query('SELECT COUNT(*) as count FROM orch_tasks WHERE status = ?', ['queued']);

    if (claimedTasksCount[0].count === 0 && queueDepth[0].count === 0) {
        await smsAlerts.sendAlert('Adam', 'System stuck - no work happening.');
    }

    const lastDeployment = await fetch(RAILWAY_API_URL);
    const deploymentStatus = await lastDeployment.json();

    if (deploymentStatus.status === 'failed') {
        await smsAlerts.sendAlert('Adam', `Deployment failed: ${deploymentStatus.error}`);
    }
}

cron.schedule(`*/${CHECK_INTERVAL} * * * *`, () => {
    console.log('Running health check...');
    checkHealth();
});