<!-- SYNOPSIS: LifeOS Dashboard Calendar Tile Brief -->

# LifeOS Dashboard Calendar Tile Brief

This document specifies the expected data shape and behavior for the calendar tile displayed on the LifeOS Dashboard (`public/overlay/lifeos-dashboard.html`). It outlines the current implementation's expectations and provides guidance for future enhancements, particularly regarding timezone handling, all-day events, and ICS integration.

## API Endpoint

The calendar tile currently fetches its data from the following API endpoint:

`GET /api/v1/lifeos/calendar/today`

## Calendar Event Data Shape (API Response)

The `/api/v1/lifeos/calendar/today` endpoint is expected to return a JSON array of event objects. Each object should conform to the following structure to support current rendering and future enhancements:

```json
[
  {
    "id": "string", // Unique identifier for the event (e.g., UUID, external system ID)
    "title": "string", // The primary title or name of the event
    "description": "string | null", // Optional: detailed description of the event
    "start_time_iso": "string", // ISO 8601 formatted datetime string (e.g., "2024-07-20T09:00:00Z" or "2024-07-20T14:00:00-04:00")
    "end_time_iso": "string | null", // Optional: ISO 8601 formatted end datetime string. If null, event is assumed to be instantaneous or duration derived from start_time_iso.
    "is_all_day": "boolean", // True if the event spans the entire day(s) without specific start/end times within the day.
    "timezone": "string", // IANA timezone name (e.g., "America/New_York", "UTC") for the event's start/end times.
    "location": "string | null", // Optional: physical address or virtual meeting link
    "url": "string | null", // Optional: URL for more information about the event
    "ics_uid": "string | null", // Optional: Unique identifier from an ICS file, for future linking and synchronization.
    "display_time": "string" // Formatted time string for direct display in the UI (e.g., "9:00 AM", "10:30 AM - 11:00 AM", "All Day"). This is what the current frontend consumes.
  }
]
```

## Timezone Handling

*   **Backend Responsibility:** The backend (`/api/v1/lifeos/calendar/today`) is responsible for:
    *   Storing event times with explicit timezone information (preferably UTC or the event's original IANA timezone).
    *   Converting event times to the user's preferred timezone (or a system default) when querying for "today's" events.
    *   Generating the `display_time` string, ensuring it reflects the event's time in the context of the user's timezone.
*   **Frontend Behavior:** The current dashboard frontend consumes the `display_time` string directly, relying on the backend for correct timezone formatting. The `start_time_iso`, `end_time_iso`, and `timezone` fields are provided for future client-side rendering logic that might require more granular timezone control (e.g., displaying events in different timezones, or allowing user-selected timezone overrides).

## All-Day Event Handling

*   **Backend Responsibility:** The backend determines if an event is an all-day event and sets the `is_all_day` boolean field accordingly. For all-day events, `start_time_iso` typically represents the start of the day (e.g., `YYYY-MM-DDT00:00:00` in the event's timezone), and `end_time_iso` (if present) would represent the end of the last day.
*   **Frontend Behavior:** The current dashboard frontend relies on the `display_time` field to indicate all-day events (e.g., `display_time: "All Day"`). The `is_all_day` boolean provides a programmatic flag for future UI enhancements to render all-day events with distinct visual treatments (e.g., a dedicated "All Day" section).

## ICS Future Hook

The `ics_uid` field is reserved for future integration with iCalendar (`.ics`) files and external calendar systems. This unique identifier can be used to:

*   **External Linking:** Provide a stable reference to the original event in an external calendar service (e.g., Google Calendar, Outlook Calendar).
*   **Synchronization:** Facilitate bi-directional synchronization or one-way imports/exports of events in `.ics` format.
*   **Detailed View:** Allow the dashboard to fetch or link to the full `.ics` data for an event, enabling more detailed views or actions.

This field is currently for data storage and API expansion; the dashboard UI does not yet expose functionality directly related to `.ics` files.