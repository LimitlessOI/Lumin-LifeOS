### Calendar Tile Data Specification

This document outlines the expected data shape, timezone handling, all-day event representation, and a future hook for ICS integration for the calendar tile displayed on the LifeOS Dashboard (`public/overlay/lifeos-dashboard.html`).

#### Current Behavior Summary

The dashboard's "Today's Schedule" tile fetches events from `/api/v1/lifeos/engine/calendar/events?days=1&limit=8`. It displays the event time (if available) and title. Times are formatted using the client's local timezone via `toLocaleTimeString()`.

#### Event Data Shape

The API endpoint `/api/v1/lifeos/engine/calendar/events` is expected to return a JSON object with an `events` array. Each event object within this array should conform to the following structure:

```json
{
  "id": "string",             // Unique identifier for the event.
  "title": "string",          // The primary title or name of the event.
  "description": "string",    // (Optional) A more detailed description of the event.
  "starts_at": "string",      // ISO 8601 timestamp indicating the start of the event.
                              // Examples: "2024-07-20T09:00:00Z" (UTC), "2024-07-20T14:00:00-05:00" (with offset).
                              // For all-day events, this should be the start of the day in UTC (e.g., "2024-07-20T00:00:00Z").
  "ends_at": "string",        // ISO 8601 timestamp indicating the end of the event.
                              // For all-day events, this should be the start of the *next* day in UTC (e.g., "2024-07-21T00:00:00Z").
  "is_all_day": "boolean",    // Flag indicating if the event is an all-day event.
  "timezone": "string",       // (Optional) IANA timezone name (e.g., "America/New_York", "Europe/London")
                              // representing the original timezone of the event. If omitted, UTC is assumed for `starts_at`/`ends_at`.
  "location": "string",       // (Optional) Physical or virtual location of the event.
  "url": "string"             // (Optional) A URL related to the event (e.g., video conference link, external calendar link).
}
```

#### Timezone Handling

1.  **Backend:** Event `starts_at` and `ends_at` timestamps should ideally be provided in UTC (ending with `Z`) or with explicit timezone offsets. If a `timezone` field (IANA name) is provided, it indicates the original timezone of the event.
2.  **Frontend (`lifeos-dashboard.html`):**
    *   The current implementation uses `new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })`. This method automatically converts the provided timestamp to the *client's local timezone* for display.
    *   For accurate display, especially for users traveling or with different local timezones than the event's original timezone, the backend should consistently provide UTC timestamps. The client's `Date` object will then correctly interpret and display them in the user's local time.
    *   The `timezone` field in the data shape is for informational purposes or future enhancements where the user might want to see the event in its original timezone.

#### All-Day Event Handling

1.  **Backend:**
    *   For all-day events, the `is_all_day` field should be set to `true`.
    *   `starts_at` should represent the beginning of the day (e.g., `YYYY-MM-DDT00:00:00Z`) and `ends_at` the beginning of the *next* day (e.g., `YYYY-MM-(D+1)T00:00:00Z`) in UTC.
2.  **Frontend (`lifeos-dashboard.html`):**
    *   The current rendering logic checks if `ev.starts_at` or `ev.start_time` exists to display a time.
    *   **Proposed Enhancement:** If `is_all_day` is `true`, the frontend should explicitly *not* display a specific time (`<span class="event-time">`). Instead, it could display "All Day" or omit the time entirely, as per current behavior if `starts_at` is missing. The current code would render an empty `event-time` span if `starts_at` is null/undefined, which is a partial solution. A more robust solution would be to check `is_all_day` directly.

#### ICS Integration (Future Hook)

To enable future integration with external calendar systems via ICS (iCalendar) files, the following considerations are noted:

1.  **Export:** An API endpoint (e.g., `GET /api/v1/lifeos/engine/calendar/events/export.ics?event_id=<id>`) could be implemented to generate and serve an `.ics` file for a specific event or a range of events. This would allow users to easily add LifeOS events to their external calendars.
2.  **Import:** An API endpoint (e.g., `POST /api/v1/lifeos/engine/calendar/events/import`) could be developed to accept an `.ics` file or URL, parse its contents, and create corresponding events within LifeOS. This would facilitate syncing external calendars into LifeOS.
3.  **Data Mapping:** Ensure the LifeOS event data shape can be mapped effectively to standard ICS properties (e.g., `SUMMARY` for `title`, `DTSTART`/`DTEND` for `starts_at`/`ends_at`, `DESCRIPTION` for `description`, `LOCATION` for `location`, `URL` for `url`). Special attention should be paid to `DTSTART`/`DTEND` for all-day events (which use `DATE` values in ICS) and timezone properties (`TZID`).