# LIFEOS Dashboard Builder Brief: Calendar Tile Behavior

This document specifies the expected data shape, timezone handling, all-day event representation, and future integration hooks for calendar tile behavior within the LIFEOS Dashboard. This serves as a contract for data providers and UI components.

## 1. Calendar Event Data Shape

Calendar events are represented by a standardized object structure to ensure consistency across the platform.

```typescript
interface CalendarEvent {
  id: string;             // Unique identifier for the event
  title: string;          // Display title of the event
  start: string;          // ISO 8601 timestamp for event start (e.g., '2024-07-20T09:00:00Z')
  end: string;            // ISO 8601 timestamp for event end (e.g., '2024-07-20T10:00:00Z')
  isAllDay: boolean;      // True if this is an all-day event
  location?: string;      // Optional physical location or meeting room
  description?: string;   // Optional detailed description of the event
  url?: string;           // Optional URL for video conference, external link, etc.
  timezone?: string;      // IANA Time Zone Database name (e.g., 'America/New_York').
                          // If not provided, defaults to user's configured timezone or UTC.
  attendees?: {
    name?: string;
    email: string;
    status?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }[];                    // Optional list of attendees
}
```

## 2. Timezone Handling

*   **Internal Storage**: All `start` and `end` timestamps are stored internally in UTC and represented using ISO 8601 format with the 'Z' suffix (e.g., `2024-07-20T09:00:00Z`).
*   **Event Timezone**: Events can optionally specify their own `timezone` using an IANA Time Zone Database name (e.g., `America/New_York`). This indicates the original timezone context of the event.
*   **Display**: UI components are responsible for converting event times from UTC to the user's configured display timezone or the event's specified `timezone` for accurate presentation.
*   **User Preference**: The platform will provide a mechanism for users to set their preferred display timezone.

## 3. All-Day Event Handling

*   **`isAllDay` Flag**: The `isAllDay` boolean flag explicitly indicates whether an event spans a full day or multiple full days.
*   **Timestamps for All-Day Events**:
    *   For `isAllDay: true`, the `start` and `end` fields will represent the beginning and end of the *date range* in UTC, typically at midnight (e.g., `2024-07-20T00:00:00Z` for start, `2024-07-21T00:00:00Z` for end of a single all-day event on July 20th).
    *   UI components should interpret these timestamps as date-only for display purposes, ignoring the time component and rendering the event across the specified dates.
*   **Timezone Context**: Even for all-day events, the `timezone` field can provide context for the geographical day definition (e.g., an all-day event in Tokyo will span the local Tokyo day).

## 4. ICS Future Hook

*   **Planned Integration**: The platform will support the import and export of calendar events using the iCalendar (ICS) format.
*   **Dedicated Service**: A dedicated service or utility will be developed to handle the parsing of `.ics` files into the `CalendarEvent` data shape and the serialization of `CalendarEvent` objects back into `.ics` format.
*   **API Endpoint**: Future API endpoints will be exposed to facilitate these import/export operations, allowing for seamless integration with external calendar systems.
*   **Scope**: This hook is for data exchange; direct rendering of ICS files is not within the scope of the calendar tile itself.