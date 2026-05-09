# Calendar Tile Data Specification

This document outlines the data shape, timezone handling, all-day event management, and future ICS integration for the LifeOS Dashboard calendar tile, based on the existing `public/overlay/lifeos-dashboard.html` implementation.

## 1. Current Behavior (from `lifeos-dashboard.html`)

The calendar tile fetches events from `/api/v1/lifeos/engine/calendar/events?days=1&limit=8`. It iterates through the `events` array in the response and displays each event.

- **Time Display:** If `ev.starts_at` or `ev.start_time` is present, it's parsed by `new Date()` and formatted using `toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })`.
- **Title Display:** The event title is taken from `ev.title` or `ev.name`.

## 2. Data Shape Specification

For robust calendar event representation, the following data shape is specified for events returned by `/api/v1/lifeos/engine/calendar/events`:

```json
{
  "events": [
    {
      "id": "string",             // Unique identifier for the event
      "title": "string",          // Primary display title of the event (e.g., "Team Sync")
      "description": "string",    // Optional: Detailed description of the event
      "starts_at": "string",      // ISO 8601 datetime string (e.g., "2024-07-20T09:00:00Z")
      "ends_at": "string",        // ISO 8601 datetime string (e.g., "2024-07-20T10:00:00Z")
      "is_all_day": "boolean",    // True if this is an all-day event
      "location": "string",       // Optional: Physical or virtual location (e.g., "Zoom", "Office")
      "url": "string",            // Optional: URL for event details or joining (e.g., meeting link)
      "calendar_id": "string",    // Optional: Identifier for the source calendar
      "organizer": {              // Optional: Information about the event organizer
        "name": "string",
        "email": "string"
      }
    }
  ]
}
```

**Notes on `starts_at` / `ends_at`:**
- These fields should always be provided in UTC (Zulu time) to ensure consistent interpretation across different client timezones.
- For all-day events, `starts_at` should represent the start of the day in UTC (e.g., `YYYY-MM-DDT00:00:00Z`) and `ends_at` the end of the day (e.g., `YYYY-MM-DDT23:59:59Z`) or the start of the *next* day (e.g., `YYYY-MM-DDT00:00:00Z` for a 24-hour duration).

## 3. Timezone Handling

- **Backend:** All event times (`starts_at`, `ends_at`) must be stored and transmitted in UTC (Coordinated Universal Time) using ISO 8601 format with the 'Z' suffix (e.g., `2024-07-20T09:00:00Z`). This ensures a single source of truth for event timing.
- **Frontend (`lifeos-dashboard.html`):** The `new Date()` constructor, when given an ISO 8601 UTC string, automatically creates a Date object representing that UTC time. The `toLocaleTimeString()` method then formats this Date object into the user's local timezone, respecting their system settings. This client-side localization is the desired behavior.

## 4. All-Day Event Handling

- **Data:** The `is_all_day: true` flag should be set for all-day events. `starts_at` and `ends_at` should still be provided in UTC, typically representing the start and end of the day.
- **Display (`lifeos-dashboard.html`):** The current implementation checks for the presence of `starts_at` or `start_time` to display a time. For all-day events where a specific time is not relevant (or `starts_at` is set to midnight UTC), the `event-time` span will be empty, effectively displaying only the event title. This behavior is acceptable. Future enhancements could explicitly display "All Day" if `is_all_day` is true.

## 5. ICS Integration (Future Hook)

To support iCalendar (ICS) integration for importing and exporting calendar data, the following hooks are envisioned:

-   **ICS Import Endpoint:**
    -   **Purpose:** Allow users to upload or provide a URL to an `.ics` file to import events into their LifeOS calendar.
    -   **Endpoint:** `POST /api/v1/lifeos/engine/calendar/ics/import`
    -   **Request Body:** Could accept either a raw ICS string or a URL to an ICS file.
    -   **Processing:** The backend would parse the ICS data, validate events, and persist them according to the specified data shape.
    -   **Error Handling:** Provide clear feedback on parsing errors, duplicate events, or invalid data.

-   **ICS Export Endpoint:**
    -   **Purpose:** Allow users to download their LifeOS calendar events as an `.ics` file.
    -   **Endpoint:** `GET /api/v1/lifeos/engine/calendar/ics/export`
    -   **Query Parameters:** Could include `start_date`, `end_date`, `calendar_id` to filter exported events.
    -   **Response:** `Content-Type: text/calendar` with the generated ICS file content.

These hooks would enable interoperability with external calendar systems, enhancing the utility of the LifeOS calendar.