// api_health_check.js
const axios = require('axios');
const slackNotifier = require('./slack_notifier');

const BOLD_TRAIL_API_URL = 'https://api.boldtrail.com';
const LAST_SYNC_TIMESTAMP = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

async function checkBoldTrailAPI() {
    try {
        const response = await axios.get(`${BOLD_TRAIL_API_URL}/health`);
        return response.status === 200;
    } catch (error) {
        console.error('BoldTrail API check failed:', error);
        return false;
    }
}

async function checkLastLeadSync() {
    // Simulate fetching last lead sync timestamp from a database
    const lastLeadSync = new Date(); // Replace with actual timestamp retrieval logic
    return lastLeadSync > LAST_SYNC_TIMESTAMP;
}

async function checkVapiCallLog() {
    // Simulate checking Vapi call log for errors
    // Replace with actual log checking logic
    const hasErrors = false; // Assume no errors for now
    return !hasErrors;
}

async function runChecks() {
    const checks = await Promise.all([
        checkBoldTrailAPI(),
        checkLastLeadSync(),
        checkVapiCallLog()
    ]);

    const failures = checks.filter(result => !result);
    if (failures.length > 0) {
        await slackNotifier.notify(failures);
    }
    return checks;
}

module.exports = { runChecks };