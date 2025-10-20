const db = require('../db');
const logger = require('../logger');
const smsAlerts = require('./sms-alerts');

const RELEASE_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

async function releaseStuckTasks() {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - RELEASE_THRESHOLD);
    const stuckTasks = await db.query('SELECT * FROM orch_tasks WHERE status = ? AND updated_at < ?', ['claimed', cutoffTime]);

    for (const task of stuckTasks) {
        await db.query('UPDATE orch_tasks SET status = ? WHERE id = ?', ['queued', task.id]);
        logger.log(`Released stuck task ${task.id} back to queue.`);
        await smsAlerts.sendAlert('Adam', `Released stuck task ${task.id} back to queue.`);
    }
}

module.exports = releaseStuckTasks;