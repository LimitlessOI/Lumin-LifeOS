const { google } = require('googleapis');
const calendar = google.calendar('v3');

// Google Calendar API setup
const auth = new google.auth.GoogleAuth({
  keyFile: 'path/to/service-account.json',
  scopes: ['https://www.googleapis.com/auth/calendar']
});

async function syncToGoogleCalendar(calendarId, timeSlot) {
  const authClient = await auth.getClient();
  const event = {
    summary: 'Meeting',
    start: {
      dateTime: timeSlot.start,
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: timeSlot.end,
      timeZone: 'America/New_York',
    },
  };

  await calendar.events.insert({
    auth: authClient,
    calendarId: calendarId,
    resource: event,
  });
}

async function getAvailableTimes(calendarId) {
  // Logic to fetch available times from Google Calendar
  return ['2023-10-01T09:00:00-04:00', '2023-10-01T10:00:00-04:00']; // Example times
}

async function createBoldTrailTask(agentId, timeSlot, prospectEmail) {
  // Logic to create a task in BoldTrail
}

async function sendConfirmationEmail(agentEmail, prospectEmail, timeSlot) {
  // Logic to send confirmation email using nodemailer
}

async function sendTextConfirmation(agentPhone, prospectPhone, timeSlot) {
  // Logic to send confirmation text using Twilio
}

async function sendReminderText(phone, timeSlot, when) {
  // Logic to send reminder text using Twilio
}

async function exportICal(calendarId) {
  // Logic to export calendar in iCal format
  return 'BEGIN:VCALENDAR...'; // Example iCal data
}

module.exports = { syncToGoogleCalendar, getAvailableTimes, createBoldTrailTask, sendConfirmationEmail, sendTextConfirmation, sendReminderText, exportICal };