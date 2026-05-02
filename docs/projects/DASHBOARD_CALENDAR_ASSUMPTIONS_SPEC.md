## Calendar Tile Data Specification

This document outlines the expected data shape, timezone handling, all-day event representation, and a future hook for ICS integration for the LifeOS Dashboard calendar tile.

### 1. Data Shape

The `/api/v1/lifeos/engine/calendar/events` endpoint is expected to return an array of event objects, each conforming to the following structure:

```json
[
  {
    "id": "string",             // Unique identifier for the event (UUID)
    "title": "string",          // Primary title or name of the event
    "description": "string",    // Optional: Detailed description of the event
    "starts_at": "string",      // ISO 8601 timestamp for the event start (e.g., "2024-07-20T09:00:00Z")
    "ends_at": "string",        // ISO 8601 timestamp for the event end (e.g., "2024-07-20T10:00:00Z")
    "is_all_day": "boolean",    // True if this is an all-day event
    "location": "string",       // Optional: Physical location or meeting link
    "url": "string",            // Optional: URL related to the event (e.g., video conference link)
    "calendar_id": "string"     // Optional: Identifier for the source calendar (e.g., "google-primary")
  }
]
```

### 2. Timezone Handling

-   **API Response**: The `starts_at` and `ends_at` fields should be provided as ISO 8601 strings, preferably in UTC (indicated by a `Z` suffix) or with an explicit timezone offset.
-   **Client-Side Display**: The dashboard's JavaScript (`new Date(...).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })`) will automatically convert the provided timestamp to the user's local timezone for display. No explicit timezone conversion is performed by the API for display purposes.

### 3. All-Day Event Handling

-   **Data Representation**: An event is considered "all-day" if the `is_all_day` field is `true`. For all-day events, `starts_at` and `ends_at` should represent the start and end *dates* (e.g., `2024-07-20T00:00:00Z` for a single-day event, or `2024-07-20T00:00:00Z` to `2024-07-22T00:00:00Z` for a multi-day event). The time component for all-day events should typically be midnight UTC.
-   **UI Behavior (Current)**: The current dashboard UI (`public/overlay/lifeos-dashboard.html`) only displays a time (`event-time` span) if `starts_at` or `start_time` is present. It does not have specific rendering logic for `is_all_day`.
-   **UI Behavior (Future)**: For all-day events, the `event-time` span should be omitted, and the `event-title` should be displayed, potentially with an "All Day" indicator or date range if the event spans multiple days. This requires a future UI update.

### 4. ICS Future Hook

-   **Purpose**: This hook is intended to facilitate interoperability with external calendar systems using the iCalendar (ICS) standard.
-   **Mechanism (Proposed)**:
    -   **Export**: A future API endpoint (e.g., `GET /api/v1/lifeos/engine/calendar/events/{id}/ics`) could generate an `.ics` file for a specific event, allowing users to add it to their personal calendars.
    -   **Import**: A future service could parse `.ics` files (e.g., from email attachments or URLs) to create or update events within LifeOS.
    -   **Subscription**: Support for subscribing to external ICS feeds (e.g., `webcal://`) could be considered to automatically sync events.
-   **Current Status**: This is a conceptual future enhancement and is not currently implemented in the API or dashboard.