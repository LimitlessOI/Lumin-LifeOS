const cron = require('node-cron');
const releaseStuckTasks = require('../services/stuck-task-releaser');

cron.schedule('*/30 * * * *', async () => {
    console.log('Running task timeout check...');
    await releaseStuckTasks();
});