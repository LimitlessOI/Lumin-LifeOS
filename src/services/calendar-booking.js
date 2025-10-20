const express = require('express');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { syncToGoogleCalendar, getAvailableTimes, createBoldTrailTask, sendConfirmationEmail, sendTextConfirmation, sendReminderText, exportICal } = require('./google-calendar-sync');

const router = express.Router();

// Mock data for agents
const agents = {
  'sarahsmith': { email: 'sarah@example.com', phone: '+1234567890', calendarId: 'sarah-calendar-id' },
};

// Route to display booking page
router.get('/book/:agentId', async (req, res) => {
  const agentId = req.params.agentId;
  const agent = agents[agentId];
  if (!agent) return res.status(404).send('Agent not found');

  const availableTimes = await getAvailableTimes(agent.calendarId);
  res.render('booking', { agent, availableTimes });
});

// Route to handle booking
router.post('/book/:agentId', async (req, res) => {
  const agentId = req.params.agentId;
  const { timeSlot, prospectEmail, prospectPhone } = req.body;
  const agent = agents[agentId];

  if (!agent) return res.status(404).send('Agent not found');

  // Create booking in Google Calendar
  await syncToGoogleCalendar(agent.calendarId, timeSlot);

  // Create BoldTrail task
  await createBoldTrailTask(agentId, timeSlot, prospectEmail);

  // Send confirmation email and text
  await sendConfirmationEmail(agent.email, prospectEmail, timeSlot);
  await sendTextConfirmation(agent.phone, prospectPhone, timeSlot);

  // Set up reminders
  await sendReminderText(agent.phone, timeSlot, '1 day');
  await sendReminderText(agent.phone, timeSlot, '1 hour');

  res.send('Booking confirmed');
});

// Route to export iCal
router.get('/export/:agentId', async (req, res) => {
  const agentId = req.params.agentId;
  const agent = agents[agentId];
  if (!agent) return res.status(404).send('Agent not found');

  const icalData = await exportICal(agent.calendarId);
  res.type('text/calendar');
  res.send(icalData);
});

module.exports = router;