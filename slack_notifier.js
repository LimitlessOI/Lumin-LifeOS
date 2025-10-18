// slack_notifier.js
const axios = require('axios');
const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK';

async function notify(checkFailures) {
    const message = `Quality check failed: ${checkFailures.length} checks failed.`;
    await axios.post(SLACK_WEBHOOK_URL, { text: message });
}

module.exports = { notify };