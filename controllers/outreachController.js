const twilio = require('twilio');
const OutreachLog = require('../models/outreachLog');
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Initiate a call
exports.initiateCall = async (req, res) => {
  const { leadId, phoneNumber } = req.body;
  try {
    const call = await client.calls.create({
      url: 'http://demo.twilio.com/docs/voice.xml',
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    // Log call
    const outreachLog = new OutreachLog({
      lead_id: leadId,
      type: 'call',
      timestamp: new Date(),
      outcome: 'initiated',
      recording_url: call.recordingUrl
    });
    await outreachLog.save();

    res.status(200).json({ message: 'Call initiated', call });
  } catch (error) {
    res.status(500).json({ message: 'Error initiating call', error });
  }
};

// Send SMS
exports.sendSms = async (req, res) => {
  const { leadId, phoneNumber, message } = req.body;
  try {
    const sms = await client.messages.create({
      body: message,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    // Log SMS
    const outreachLog = new OutreachLog({
      lead_id: leadId,
      type: 'sms',
      timestamp: new Date(),
      outcome: 'sent',
      recording_url: null
    });
    await outreachLog.save();

    res.status(200).json({ message: 'SMS sent', sms });
  } catch (error) {
    res.status(500).json({ message: 'Error sending SMS', error });
  }
};

// Twilio webhook
exports.twilioWebhook = (req, res) => {
  const { CallSid, CallStatus, RecordingUrl } = req.body;
  // Update the call log with the status
  OutreachLog.updateOne({ 'call_sid': CallSid }, { outcome: CallStatus, recording_url: RecordingUrl })
    .then(() => res.status(200).send('Status updated'))
    .catch(err => res.status(500).send('Error updating status'));
};