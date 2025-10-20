// daily-digest.js
const cron = require('node-cron');
const { sendDigestSMS } = require('../services/digest-generator');

// Schedule the morning report at 8 AM
cron.schedule('0 8 * * *', () => {
    sendDigestSMS('morning');
});

// Schedule the evening report at 6 PM
cron.schedule('0 18 * * *', () => {
    sendDigestSMS('evening');
});

console.log('Daily digest SMS system is running.');