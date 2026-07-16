/**
 * SYNOPSIS: Exports integrateCalendar — services/googleCalendarIntegrationService.js.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
import { google } from 'googleapis';

const calendar = google.calendar('v3');

export async function integrateCalendar() {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    const res = await calendar.calendarList.list();
    return res.data.items;
  } catch (error) {
    console.error('Error integrating with Google Calendar:', error);
    throw error;
  }
}