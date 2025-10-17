const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const ADAM_SMS_NUMBER = process.env.ADAM_SMS_NUMBER;

const notifyHighSeverityWaiting = () => {
    return client.messages.create({
        body: 'High severity issue is waiting for attention.',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: ADAM_SMS_NUMBER
    });
};

const notifyMediumRevenueCritical = () => {
    return client.messages.create({
        body: 'Revenue critical medium severity issue is waiting.',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: ADAM_SMS_NUMBER
    });
};

const notifyPipelineBlocked = () => {
    return client.messages.create({
        body: 'Pipeline has been blocked for over 30 minutes.',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: ADAM_SMS_NUMBER
    });
};

module.exports = { notifyHighSeverityWaiting, notifyMediumRevenueCritical, notifyPipelineBlocked };