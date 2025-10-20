// digest-generator.js
const twilio = require('twilio');
const accountSid = 'your_account_sid'; // Your Account SID from www.twilio.com/console
const authToken = 'your_auth_token'; // Your Auth Token from www.twilio.com/console
const client = new twilio(accountSid, authToken);

const ADAM_SMS_NUMBER = '+1234567890'; // Replace with Adam's actual SMS number

// Function to generate morning or evening digest
const generateDigest = (type) => {
    let message = '';

    if (type === 'morning') {
        message = `🌅 Morning Report:\n\n- 📦 Yesterday's Builds: [List of builds]\n- 🛠️ Today's Tasks: [List of tasks]\n- 📈 Strategic Decisions Needed: [List of decisions]`;
    } else if (type === 'evening') {
        message = `🌆 Evening Report:\n\n- ✅ Progress Updates: [List of updates]\n- ✔️ Completed Tasks: [List of completed tasks]\n- 🚧 Blockers: [List of blockers]`;
    }

    return message;
};

// Function to send SMS
const sendDigestSMS = (type) => {
    const message = generateDigest(type);
    client.messages.create({
        body: message,
        to: ADAM_SMS_NUMBER,
        from: '+1987654321' // Replace with your Twilio number
    })
    .then((message) => console.log('SMS sent: ', message.sid))
    .catch((error) => console.error('Error sending SMS: ', error));
};

module.exports = { sendDigestSMS };