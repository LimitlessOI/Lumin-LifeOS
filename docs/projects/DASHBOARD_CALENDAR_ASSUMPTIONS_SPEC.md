# Calendar Tile Specification

This document outlines the expected data shape and current handling for calendar events displayed in the LifeOS Dashboard's "Today's Schedule" tile, based on the `public/overlay/lifeos-dashboard.html` implementation. It also includes considerations for future enhancements like timezone management and ICS integration.

## 1. Data Shape

The `/api/v1/lifeos/calendar/today` endpoint is expected to return a JSON object with an `events` array. Each object within this array represents a calendar event and must conform to the following minimal structure:

```json
{
  "events": [
    {
      "time": "string",
      "title": "string"
    },
    // ... more events
  ]
}
```

**Field Descriptions:**

*   `time`: A formatted string representing the event's start time or status (e.g., "9:00 AM", "1:30 PM", "All Day"). The frontend displays this string directly.
*   `title`: A string representing the event's name or description.

**Example Payload:**

```json
{
  "events": [
    {
      "time": "9:00 AM",
      "title": "Daily Standup"
    },
    {
      "time": "1:00 PM",
      "title": "Project Sync with Team Alpha"
    },
    {
      "time": "All Day",
      "title": "Company Holiday"
    }
  ]
}
```

## 2. Timezone Handling

The current dashboard implementation (`public/overlay/lifeos-dashboard.html`) displays the `time` string for events exactly as it is received from the `/api/v1/lifeos/calendar/today` API. There is no client-side timezone conversion or explicit timezone information processing.

**Current Assumption:** The backend API is responsible for providing the `time` string already formatted and localized to the user's preferred timezone, or a consistent timezone that the user understands.

**Future Consideration:** For more robust timezone handling, the API could provide event timestamps in ISO 8601 format (e.g., `2024-07-20T09:00:00Z` or `2024-07-20T09:00:00-05:00`), allowing the client to perform precise timezone conversions based on the user's local settings.

## 3. All-Day Event Handling

The dashboard's UI does not currently have a distinct visual treatment for all-day events. All events are rendered using the same `event-row` structure.

**Current Assumption:** All-day events are represented by a descriptive string in the `time` field, such as "All Day" or an empty string, which is then displayed directly in the `event-time` element.

**Future Consideration:** To provide a clearer distinction, the event data shape could be extended with an `is_all_day: boolean` property. This would enable the frontend to apply specific styling (e.g., no time displayed, different background) or group all-day events separately.

## 4. ICS Future Hook

Integration with external calendar systems via ICS (iCalendar) files is a backend concern. The dashboard frontend consumes a normalized event data shape, abstracting away the source of the events.

**Proposed Backend Integration Points:**

*   **New API Endpoint:** A `POST /api/v1/lifeos/calendar/subscribe-ics` endpoint could be introduced to allow users to provide an ICS URL.
*   **Backend Service:** A dedicated backend service would be responsible for:
    *   Periodically fetching ICS files from registered URLs.
    *   Parsing ICS data (e.g., using a library like `ical.js` or similar).
    *   Normalizing parsed events into the internal LifeOS event data model.
    *   Storing these events in the database, potentially with metadata linking them back to their ICS source.
*   **Existing API Enhancement:** The `/api/v1/lifeos/calendar/today` endpoint would then be enhanced to aggregate and return events from all sources, including those imported from ICS feeds, ensuring they conform to the specified data shape.

This approach keeps the frontend simple and focused on display, while centralizing complex data integration logic in the backend.