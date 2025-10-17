// calendarSync.js
const { google } = require('googleapis');

async function syncCalendar(eventData) {
    const calendar = google.calendar({ version: 'v3', auth: process.env.GOOGLE_CALENDAR_API_KEY });
    await calendar.events.insert({
        calendarId: 'primary',
        resource: eventData
    });
}

module.exports = { syncCalendar };