## Calendar Tile Specification

This document outlines the current behavior and data expectations for the "Today's Schedule" calendar tile displayed on the LifeOS Dashboard (`public/overlay/lifeos-dashboard.html`).

### 1. API Endpoint

The calendar tile fetches its data from the following API endpoint:

`GET /api/v1/lifeos/engine/calendar/events?days=1&limit=8`

-   `days=1`: Currently hardcoded to fetch events for the current day only.
-   `limit=8`: Limits the number of events displayed to a maximum of 8.

### 2. Data Shape

The API endpoint is expected to return a JSON object with an `events` array. Each object within the `events` array represents a calendar event and should conform to the following shape:

```json
[
  {
    "starts_at": "ISO 8601 timestamp string",
    "start_time": "ISO 8601 timestamp string",
    "title": "string",
    "name": "string"
  },
  // ... more events
]
```

-   **`starts_at` (string, optional)**: An ISO 8601 formatted timestamp indicating the start time of the event. This field is preferred.
-   **`start_time` (string, optional)**: An ISO 8601 formatted timestamp indicating the start time of the event. Used as a fallback if `starts_at` is not present.
-   **`title` (string, optional)**: The primary title or name of the event. This field is preferred.
-   **`name` (string, optional)**: The title or name of the event. Used as a fallback if `title` is not present.

At least one of `starts_at` or `start_time` should be present for timed events. At least one of `title` or `name` should be present for the event to display a meaningful name.

### 3. Timezone Handling

-   The client-side JavaScript uses `new Date()` to parse the `starts_at` or `start_time` string.
-   The parsed `Date` object is then formatted using `toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })`.
-   **Outcome**: Event times are displayed in the **user's local timezone** as determined by their browser settings.
-   **Expectation**: The backend should provide `starts_at` and `start_time` in a timezone-aware format (e.g., UTC with 'Z' suffix or with a timezone offset) to ensure correct conversion to the client's local time.

### 4. All-Day Event Handling

-   The current implementation does not have explicit logic for "all-day" flags.
-   If both `starts_at` and `start_time` fields are missing or null for an event, the `event-time` span will be empty and not rendered.
-   **Outcome**: Events without a specified start time will be displayed with only their title, effectively treating them as all-day events visually.
-   **Recommendation**: For true all-day events, the backend should omit `starts_at` and `start_time` fields.

### 5. ICS Future Hook

-   The client-side dashboard HTML does not directly consume or process ICS (iCalendar) files.
-   The "ICS future hook" is understood to be a **backend responsibility**. Any integration with ICS feeds (e.g., Google Calendar, Outlook Calendar, etc.) would involve the backend service:
    1.  Fetching and parsing ICS data from external sources.
    2.  Transforming the ICS event data into the `Data Shape` specified above.
    3.  Exposing this normalized event data via the `/api/v1/lifeos/engine/calendar/events` endpoint.
-   **Outcome**: The client-side calendar tile is agnostic to the source of the calendar data, as long as it conforms to the expected JSON data shape from the `/api/v1/lifeos/engine/calendar/events` endpoint.