## Calendar Tile Specification for LifeOS Dashboard

This document specifies the expected data shape, timezone handling, all-day event representation, and future integration points for the calendar tile displayed on the LifeOS dashboard. This specification is derived from the existing `public/overlay/lifeos-dashboard.html` implementation.

### 1. Purpose

The calendar tile provides a quick overview of upcoming events for the current day, allowing users to see their schedule at a glance.

### 2. API Endpoint

The dashboard currently fetches calendar events from the following API endpoint:

`GET /api/v1/lifeos/engine/calendar/events?days=1&limit=8`

*   `days`: Specifies the number of days to fetch events for (currently hardcoded to `1`).
*   `limit`: Specifies the maximum number of events to return (currently hardcoded to `8`).

### 3. Event Data Shape

The API is expected to return a JSON object with an `events` array. Each event object within this array should conform to the following structure:

```json
{
  "id": "string",           // Unique identifier for the event (e.g., UUID)
  "title": "string",        // Primary title of the event (preferred)
  "name": "string",         // Alternative title of the event (used if 'title' is absent)
  "starts_at": "string",    // ISO 8601 timestamp for the event start (e.g., "2024-07-20T09:00:00Z")
  "start_time": "string",   // Alternative ISO 8601 timestamp for event start (used if 'starts_at' is absent)
  "ends_at": "string",      // ISO 8601 timestamp for the event end (optional)
  "end_time": "string",     // Alternative ISO 8601 timestamp for event end (optional)
  "is_all_day": "boolean",  // Explicit flag for all-day events (recommended for future robustness)
  "description": "string",  // Detailed description of the event (optional, for future detail views)
  "location": "string",     // Location of the event (optional)
  "url": "string"           // URL to the original event source (optional)
}
```

**Key fields for current display:**

*   `title` (or `name`): The text displayed for the event.
*   `starts_at` (or `start_time`): Used to determine the displayed time.

### 4. Timezone Handling

The frontend renders event times using `new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })`.

*   **Client-side:** This method automatically converts the provided timestamp to the user's local timezone for display.
*   **Backend expectation:** The backend should provide `starts_at` and `start_time` values as ISO 8601 strings that either:
    *   Explicitly include timezone information (e.g., `2024-07-20T09:00:00-05:00`).
    *   Are in UTC and explicitly marked as such (e.g., `2024-07-20T14:00:00Z`).
    This ensures `new Date()` can correctly interpret the time relative to the client's local timezone.

### 5. All-Day Event Handling

*   **Current behavior:** If `starts_at` (or `start_time`) is `null` or an empty string, the event time (`<span class="event-time">`) is not rendered, effectively treating it as an all-day event.
*   **Recommended future enhancement:** Introduce an explicit `is_all_day: boolean` field in the event data shape. This allows for clearer distinction and more robust rendering logic for all-day events, independent of the presence of a `starts_at` timestamp. For example, an all-day event might still have a `starts_at` for sorting purposes, but `is_all_day` would dictate its display.

### 6. ICS Future Hook

The current dashboard does not include functionality for importing or exporting calendar data via ICS (iCalendar) files.

*   **Future integration point:** A future enhancement could involve:
    *   **Import:** An API endpoint (`POST /api/v1/lifeos/engine/calendar/import-ics`) that accepts an ICS file or URL, parses it, and creates events in the LifeOS system.
    *   **Export:** An API endpoint (`GET /api/v1/lifeos/engine/calendar/export-ics`) that generates an ICS file for a given date range or set of events, allowing users to subscribe to or download their LifeOS calendar.
    *   **Client-side parsing:** Direct client-side parsing of ICS files could also be considered for immediate display, though backend integration is generally preferred for data persistence and consistency.