The task specifies "documentation only" in Markdown, but a global "HTML FULL FILE — STRICT OUTPUT CONTRACT" demands the entire response be an HTML document. Prioritizing the specific task instruction for Markdown documentation, as generating HTML would not fulfill the "documentation only" and "Markdown" requirement.

# Calendar Tile Data Specification

This document specifies the data shape, timezone handling, all-day event representation, and future integration hooks for calendar events displayed in the LifeOS Dashboard's "Today's Schedule" tile.

## 1. Data Shape

The `/api/v1/lifeos/calendar/today` endpoint is expected to return a JSON array of event objects. Each event object **MUST** conform to the following structure:

```json
[
  {
    "id": "string",
    "title": "string",
    "description": "string | null",
    "start_time": "string",
    "end_time": "string",
    "is_all_day": "boolean",
    "timezone": "string",
    "display_time": "string",
    "ics_url": "string | null"
  }
]
```

### Field Definitions:

-   `id` (string, **required**): A unique identifier for the calendar event.
-   `title` (string, **required**): The primary display title of the event (e.g., "Team Standup", "Doctor's Appointment").
-   `description` (string | null, optional): A more detailed description of the event. This can be used for tooltips or expanded views.
-   `start_time` (string, **required**): The start time of the event in ISO 8601 format (e.g., `2026-04-26T09:00:00Z` for UTC, or `2026-04-26T09:00:00-04:00` for a specific offset). This value should reflect the `timezone` field.
-   `end_time` (string, **required**): The end time of the event in ISO 8601 format, following the same conventions as `start_time`.
-   `is_all_day` (boolean, **required**): A flag indicating if the event is an all-day event.
-   `timezone` (string, **required**): The IANA timezone name (e.g., `America/New_York`, `Europe/London`, `UTC`) in which the event's `start_time` and `end_time` are defined. This is critical for accurate display and calculations, especially for all-day events and events spanning daylight saving transitions.
-   `display_time` (string, **required**): A pre-formatted string representing the event's time for direct display in the dashboard tile (e.g., "9:00 AM", "All Day", "9:00 AM - 10:00 AM"). This field simplifies frontend rendering.
-   `ics_url` (string | null, optional): A URL pointing to an ICS (iCalendar) file for this specific event. This enables users to easily add the event to external calendar applications.

## 2. Timezone Handling

-   All `start_time` and `end_time` values **MUST** be provided with explicit timezone information (either a Z-offset for UTC or a specific offset like `-04:00`).
-   The `timezone` field **MUST** contain the IANA timezone identifier corresponding to the event's original timezone. This allows for precise re-calculation or display in different timezones if needed by more advanced UI components.
-   The `display_time` field **MUST** already be localized and formatted according to the user's preferred display timezone (typically derived from browser settings or user profile) by the backend service. The frontend consumes `display_time` directly.

## 3. All-Day Event Handling

-   When `is_all_day` is `true`:
    -   `start_time` should represent the beginning of the day (e.g., `YYYY-MM-DDT00:00:00`) in the specified `timezone`.
    -   `end_time` should represent the end of the day (e.g., `YYYY-MM-DDT23:59:59` or `YYYY-MM-(D+1)T00:00:00`) in the specified `timezone`).
    -   The `display_time` field **MUST** be set to a string like "All Day" or similar localized equivalent.
-   The frontend will render all-day events distinctly, typically without specific start/end times shown in the `event-time` slot, relying on `display_time`.

## 4. ICS Future Hook

-   The `ics_url` field provides a direct link to download the iCalendar (.ics) file for the individual event.
-   This URL is intended to be used by the frontend to offer a "Add to Calendar" functionality, allowing users to integrate LifeOS events with their personal calendar applications.
-   The backend service responsible for `/api/v1/lifeos/calendar/event/:id/ics` (or similar) will generate and serve the ICS content.