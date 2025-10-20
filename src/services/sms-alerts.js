const smsService = require('some-sms-library');

async function sendAlert(recipient, message) {
    await smsService.send({ to: recipient, body: message });
}

module.exports = { sendAlert };