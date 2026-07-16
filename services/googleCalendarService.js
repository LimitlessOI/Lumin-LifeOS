/**
 * SYNOPSIS: Exports createCalendarEvent — services/googleCalendarService.js.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
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

/**
 * Integrates Google Calendar with default settings
 * @returns {object} - The Google Calendar instance
 */
export function integrateCalendar() {
  return calendar;
}

/**
 * Syncs events between local storage and Google Calendar
 * @param {object} auth - Auth client
 * @param {Array} localEvents - Local event data
 * @returns {Promise<Array>} - Synced events
 */
export async function syncEvents(auth, localEvents) {
  try {
    const remoteEvents = await getCalendarEvents(auth, {});
    const newEvents = localEvents.filter(localEvent =>
      !remoteEvents.some(remoteEvent => remoteEvent.id === localEvent.id)
    );

    const createdEvents = await Promise.all(
      newEvents.map(event => createCalendarEvent(auth, event))
    );

    return [...remoteEvents, ...createdEvents];
  } catch (error) {
    throw new Error('Error syncing events: ' + error.message);
  }
}
