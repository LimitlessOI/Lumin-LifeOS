const { Client } = require('pg');
const { setInterval } = require('timers');
const process = require('process');

const client = new Client();
const listenChannel = process.env.ORCH_LISTEN_CHANNEL || 'orch_new_task';
const pollInterval = process.env.ORCH_POLL_INTERVAL_MS || 1000;
const maxConcurrency = process.env.ORCH_MAX_CONCURRENCY || 5;

let movingAvgWaitMs = 0;
let taskCount = 0;

async function claimTask() {
    const res = await client.query('SELECT id FROM orch_tasks WHERE status = \'queued\' FOR UPDATE SKIP LOCKED LIMIT 1');
    if (res.rows.length > 0) {
        const taskId = res.rows[0].id;
        await client.query('UPDATE orch_tasks SET status = \'processing\' WHERE id = $1', [taskId]);
        return taskId;
    }
    return null;
}

async function listenForTasks() {
    await client.connect();
    await client.query(`LISTEN ${listenChannel}`);

    client.on('notification', async (msg) => {
        const start = Date.now();
        const taskId = await claimTask();
        const waitTime = Date.now() - start;
        updateMovingAvg(waitTime);
        console.log(`Claimed task: ${taskId} in ${waitTime} ms`);
    });
}

function updateMovingAvg(waitTime) {
    taskCount++;
    movingAvgWaitMs = ((movingAvgWaitMs * (taskCount - 1)) + waitTime) / taskCount;
}

function fallbackPolling() {
    setInterval(async () => {
        const start = Date.now();
        const taskId = await claimTask();
        const waitTime = Date.now() - start;
        if (taskId) {
            updateMovingAvg(waitTime);
            console.log(`Fallback claimed task: ${taskId} in ${waitTime} ms`);
        }
    }, pollInterval);
}

listenForTasks();
fallbackPolling();