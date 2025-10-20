const twilio = require('twilio');
const OutreachLog = require('../models/outreachLog');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.initiateCall = async (req, res) => {
  const { lead_id, phoneNumber } = req.body;
  try {
    const call = await client.calls.create({
      url: 'http://example.com/your-twilio-script', // URL for Twilio to fetch the recording
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    await OutreachLog.create({ lead_id, type: 'call', timestamp: new Date(), outcome: 'initiated', recording_url: call.recordingUrl });
    res.status(200).json({ message: 'Call initiated', call });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendSMS = async (req, res) => {
  const { lead_id, phoneNumber, message } = req.body;
  try {
    const sms = await client.messages.create({
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: message
    });
    await OutreachLog.create({ lead_id, type: 'sms', timestamp: new Date(), outcome: 'sent', recording_url: null });
    res.status(200).json({ message: 'SMS sent', sms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.twilioWebhook = async (req, res) => {
  const { CallSid, CallStatus, RecordingUrl } = req.body;
  try {
    // Assume we have a way to retrieve lead_id from CallSid
    const lead_id = await getLeadIdFromCallSid(CallSid);
    await OutreachLog.create({ lead_id, type: 'call', timestamp: new Date(), outcome: CallStatus, recording_url: RecordingUrl });
    res.status(200).send('Webhook received');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

async function getLeadIdFromCallSid(callSid) {
  // Implement a way to retrieve lead_id based on CallSid
  return 'some-lead-id';
}