# Calendar Tile Behavior Specification

This document outlines the expected data shape, timezone handling, all-day event representation, and a future hook for ICS integration for the calendar tile displayed on the LifeOS Dashboard (`public/overlay/lifeos-dashboard.html`).

## 1. Data Shape

The `/api/v1/lifeos/calendar/today` endpoint is expected to return a JSON object containing an array of event objects. Each event object must conform to the following structure:

```json
{
  "events": [
    {
      "time": "string",
      "title": "string",
      "id": "string (optional)",
      "description": "string (optional)",
      "is_all_day": "boolean (optional)"
    },
    // ... more events
  ]
}
```

**Required Fields for Display:**
- `time`: A user-friendly string representing the event's start time or "All Day" for all-day events. Examples: "9:00 AM", "1:30 PM", "All Day".
- `title`: The main title or name of the event.

**Optional Fields (for future enhancements or backend context):**
- `id`: A unique identifier for the event, useful for actions like editing or deleting.
- `description`: A more detailed description of the event.
- `is_all_day`: A boolean flag indicating if the event is an all-day event. While `time` handles the display, this flag provides programmatic context.

## 2. Timezone Handling

The current frontend implementation (`public/overlay/lifeos-dashboard.html`) displays the `time` string as provided by the backend without any client-side timezone conversion.

- **Responsibility:** The backend API (`/api/v1/lifeos/calendar/today`) is solely responsible for determining the user's timezone and formatting the `time` string accordingly before sending it to the frontend.
- **Recommendation:** The backend should use a user-specific timezone setting (e.g., from user preferences or inferred from request headers) to localize event times.

## 3. All-Day Event Handling

All-day events are currently represented by a specific string in the `time` field.

- **Representation:** For all-day events, the `time` field in the event object should contain the string "All Day" (or a similar localized equivalent).
- **Frontend Display:** The frontend simply renders this string directly. There is no special styling or logic applied to events marked as "All Day" beyond the standard `event-time` styling.
- **Future Enhancement:** The optional `is_all_day: true` field could be used in the future to apply distinct styling or filtering for all-day events if required.

## 4. ICS Future Hook

An ICS (iCalendar) future hook would enable integration with external calendar systems or allow users to download event data in a standard format.

- **Proposed Integration Point:** A new API endpoint could be introduced to generate or consume ICS data.
    - **Export:** `GET /api/v1/lifeos/calendar/export.ics?date=YYYY-MM-DD` (or similar) to download an ICS file for a specific day or range.
    - **Import:** `POST /api/v1/lifeos/calendar/import` with an ICS file payload to add events.
- **Client-Side Interaction:** A button or link could be added to the calendar tile (e.g., "Add to Calendar" for individual events, or "Download Day's Events") that triggers the ICS export API.
- **Data Source:** The ICS generation would leverage the same underlying calendar data used by `/api/v1/lifeos/calendar/today`, but would need to include more detailed fields (e.g., `DTSTART`, `DTEND`, `TZID`, `LOCATION`, `DESCRIPTION`, `UID`) to conform to the ICS standard.