// cron_job.js
const cron = require('node-cron');
const apiHealthCheck = require('./api_health_check');

// Schedule a cron job to run every 6 hours
cron.schedule('0 */6 * * *', async () => {
    console.log('Running quality checks...');
    await apiHealthCheck.runChecks();
});
