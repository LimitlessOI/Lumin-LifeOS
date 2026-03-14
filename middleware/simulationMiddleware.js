/**
 * Simulation Middleware — intercepts outreach call/SMS routes and, when Twilio
 * credentials are absent, logs a simulated outcome with a fake recording URL
 * instead of making real API calls.
 *
 * Dependencies: ../models/outreachLog, process.env.TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 * Exports: callOutreach(req, res), smsOutreach(req, res)
 */
const OutreachLog = require('../models/outreachLog');
const isSimulationMode = !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN;

// Generate a fake recording URL
const generateFakeRecordingUrl = () => 'http://fake-recording-url.com/recording.mp3';

const callOutreach = async (req, res) => {
  const logEntry = { type: 'call', outcome: isSimulationMode ? 'simulated' : 'completed', details: req.body };
  if (isSimulationMode) {
    logEntry.details.recordingUrl = generateFakeRecordingUrl();
    logEntry.outcome = 'simulated';
  }
  await OutreachLog.create(logEntry);
  return res.status(200).json({ message: 'Call processed', outcome: logEntry.outcome, recordingUrl: logEntry.details.recordingUrl });
};

const smsOutreach = async (req, res) => {
  const logEntry = { type: 'sms', outcome: isSimulationMode ? 'simulated' : 'sent', details: req.body };
  await OutreachLog.create(logEntry);
  return res.status(200).json({ message: 'SMS processed', outcome: logEntry.outcome });
};

module.exports = { callOutreach, smsOutreach };