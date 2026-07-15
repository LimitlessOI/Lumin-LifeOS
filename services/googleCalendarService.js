/**
 * SYNOPSIS: Creates a calendar event
 */
import { google } from 'googleapis';

const calendar = google.calendar('v3');

/**
 * Creates a calendar event
 * @param {object} auth - Auth client
 * @param {object} eventDetails - Event details
 * @returns {Promise<object>} - The created event
 */
export async function createCalendarEvent(auth, eventDetails) {
  try {
    const response = await calendar.events.insert({
      auth,
      calendarId: 'primary',
      resource: eventDetails,
    });
    return response.data;
  } catch (error) {
    throw new Error('Error creating calendar event: ' + error.message);
  }
}

/**
 * Retrieves calendar events
 * @param {object} auth - Auth client
 * @param {object} queryParams - Query parameters
 * @returns {Promise<Array>} - List of calendar events
 */
export async function getCalendarEvents(auth, queryParams) {
  try {
    const response = await calendar.events.list({
      auth,
      calendarId: 'primary',
      ...queryParams,
    });
    return response.data.items;
  } catch (error) {
    throw new Error('Error retrieving calendar events: ' + error.message);
  }
}
