/**
 * SYNOPSIS: Implement calendar integration and event syncing.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
import { google } from 'googleapis';

// connect to Google Calendar API
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
 * SYNOPSIS: Integrates Google Calendar using default settings.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
export async function integrateCalendar(deps, payload) {
  const { pool, logger } = deps;
  const { userId } = payload || {}; // Assuming payload might contain a userId to fetch calendar info

  try {
    // Example: Fetch user's primary calendar from lifeos_calendars
    const { rows } = await pool.query(
      'SELECT * FROM lifeos_calendars WHERE user_id = $1 AND is_primary = TRUE AND provider = $2',
      [userId, 'google']
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in integrateCalendar');
    throw new Error('Failed in integrateCalendar');
  }
}

/**
 * SYNOPSIS: Syncs events between local storage (LifeOS DB) and Google Calendar.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
export async function syncEvents(deps, payload) {
  const { pool, logger } = deps;
  const { userId, calendarId, authClient } = payload || {}; // authClient would be a Google API auth object

  if (!userId || !calendarId || !authClient) {
    throw new Error('Missing userId, calendarId, or authClient for syncEvents');
  }

  try {
    // Fetch local events from lifeos_calendar_events for the given calendarId
    const { rows: localEvents } = await pool.query(
      'SELECT provider_event_id, title, description, location, starts_at, ends_at, all_day, status, metadata FROM lifeos_calendar_events WHERE user_id = $1 AND calendar_id = $2',
      [userId, calendarId]
    );

    // Fetch remote events from Google Calendar
    const remoteEvents = await getCalendarEvents(authClient, {}); // Assuming getCalendarEvents uses authClient

    // Identify events to create in Google Calendar (local but not remote)
    const eventsToCreateInGoogle = localEvents.filter(localEvent =>
      !remoteEvents.some(remoteEvent => remoteEvent.id === localEvent.provider_event_id)
    ).map(event => ({
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.starts_at.toISOString(),
        timeZone: 'UTC', // Assuming UTC for simplicity, should be dynamic
      },
      end: {
        dateTime: event.ends_at.toISOString(),
        timeZone: 'UTC', // Assuming UTC for simplicity, should be dynamic
      },
      // You might need to map other fields from localEvent to Google Calendar event format
    }));

    // Create new events in Google Calendar
    const createdGoogleEvents = await Promise.all(
      eventsToCreateInGoogle.map(event => createCalendarEvent(authClient, event))
    );

    // Identify events to update or create in LifeOS (remote but not local, or updated remote)
    for (const remoteEvent of remoteEvents) {
      const existingLocalEvent = localEvents.find(
        localEvent => localEvent.provider_event_id === remoteEvent.id
      );

      if (!existingLocalEvent) {
        // Event exists in Google but not in LifeOS, create it in LifeOS
        await pool.query(
          `INSERT INTO lifeos_calendar_events (user_id, calendar_id, source, provider_event_id, title, description, location, starts_at, ends_at, all_day, status, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            userId,
            calendarId,
            'google', // Source
            remoteEvent.id,
            remoteEvent.summary,
            remoteEvent.description,
            remoteEvent.location,
            new Date(remoteEvent.start.dateTime || remoteEvent.start.date),
            new Date(remoteEvent.end.dateTime || remoteEvent.end.date),
            !!remoteEvent.start.date, // all_day based on date vs dateTime
            remoteEvent.status,
            remoteEvent, // Store full metadata
          ]
        );
      } else {
        // Event exists in both, check for updates (simplified: compare updated_at or full content)
        // For a full implementation, you'd need more sophisticated diffing.
        // For now, let's assume remote is authoritative for simpler fields if dates differ.
        const remoteStartTime = new Date(remoteEvent.start.dateTime || remoteEvent.start.date);
        const remoteEndTime = new Date(remoteEvent.end.dateTime || remoteEvent.end.date);

        if (existingLocalEvent.starts_at.getTime() !== remoteStartTime.getTime() ||
            existingLocalEvent.ends_at.getTime() !== remoteEndTime.getTime() ||
            existingLocalEvent.title !== remoteEvent.summary ||
            existingLocalEvent.description !== remoteEvent.description ||
            existingLocalEvent.location !== remoteEvent.location ||
            existingLocalEvent.status !== remoteEvent.status) {

          await pool.query(
            `UPDATE lifeos_calendar_events
             SET title = $1, description = $2, location = $3, starts_at = $4, ends_at = $5, all_day = $6, status = $7, metadata = $8, updated_at = NOW()
             WHERE id = $9`,
            [
              remoteEvent.summary,
              remoteEvent.description,
              remoteEvent.location,
              remoteStartTime,
              remoteEndTime,
              !!remoteEvent.start.date,
              remoteEvent.status,
              remoteEvent,
              existingLocalEvent.id,
            ]
          );
        }
      }
    }

    // Return a combined list of events (local + newly created in Google)
    // For a robust sync, you'd fetch the latest from both after all operations.
    // For this task, we'll return a simple indication of success.
    return {
      message: 'Calendar sync completed successfully',
      createdGoogleEventsCount: createdGoogleEvents.length,
      remoteEventsCount: remoteEvents.length,
      localEventsCount: localEvents.length,
    };

  } catch (error) {
    logger.error({ error }, 'Error syncing events');
    throw new Error('Failed to sync events: ' + error.message);
  }
}