# Calendar Tile Behavior Specification

This document outlines the expected data shape, timezone handling, all-day event representation, and future ICS integration for calendar tiles within the LifeOS Dashboard.

## 1. Data Shape for Calendar Events

Calendar events are represented by the following structure:

```typescript
interface CalendarEvent {
  id: string; // Unique identifier for the event
  title: string; // Display title of the event
  start: string; // ISO 8601 formatted datetime string (e.g., "2024-07-20T10:00:00Z" or "2024-07-20T15:30:00-05:00")
  end: string; // ISO 8601 formatted datetime string
  allDay: boolean; // True if this is an all-day event
  location?: string; // Optional physical or virtual location
  description?: string; // Optional detailed description
  url?: string; // Optional URL for meeting link or more information
  calendarId?: string; // Identifier for the source calendar (e.g., "google-primary", "outlook-work", "lifeos-internal")
  isRecurring?: boolean; // True if this event is part of a recurring series
  recurrenceRule?: string; // Optional iCal RRULE string for recurring events
}
```

## 2. Timezone Handling

*   **Storage:** All event `start` and `end` times are stored as ISO 8601 strings, preferably with explicit UTC offset (`Z`) or a specific timezone offset. This ensures unambiguous time representation.
*   **Display:** The client-side rendering logic is responsible for converting stored event times to the user's local timezone for display. This typically leverages browser-native `Date` object capabilities or a robust date-time library.
*   **User Preference:** Future enhancements may include explicit user timezone preferences, but the default behavior is to use the client's detected local timezone.

## 3. All-Day Event Handling

*   **`allDay` Flag:** The `allDay: true` property explicitly marks an event as an all-day event.
*   **Time Ignored for Display:** When `allDay` is `true`, the specific time components of `start` and `end` are generally ignored for display purposes. The event is rendered as spanning the entire day(s).
*   **Date Range:** For all-day events, `start` and `end` should still represent the inclusive date range. For a single all-day event on July 20th, `start` might be `2024-07-20T00:00:00Z` and `end` might be `2024-07-21T00:00:00Z` (exclusive end) or `2024-07-20T23:59:59Z` (inclusive end), but the `allDay` flag dictates the rendering.
*   **Timezone Agnostic Display:** All-day events are typically displayed as timezone-agnostic (e.g., "July 20th" is July 20th regardless of the viewer's timezone, though the *moment* that day begins and ends varies globally).

## 4. ICS Future Hook

A future hook for ICS (iCalendar) integration will enable users to:

*   **Export Events:** Download individual events or entire calendar views as `.ics` files, allowing them to be imported into other calendar applications.
*   **Subscribe to Calendars:** Potentially subscribe to LifeOS-generated calendars via a URL, which would serve an `.ics` feed.

This hook implies the existence of a service or utility that can:

1.  Take `CalendarEvent` data as input.
2.  Generate a valid iCalendar string or file content conforming to RFC 5545.
3.  Expose this functionality, likely via a dedicated API endpoint (e.g., `GET /api/v1/calendar/events/:id/ics` for single events, or `GET /api/v1/calendar/feed/:calendarId.ics` for subscriptions).