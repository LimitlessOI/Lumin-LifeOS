The specification is incomplete as the primary source file `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` was not found, preventing reference to existing dashboard sections by ID/class.

### Today Category Specification

This specification outlines the proposed layout blocks and API assumptions for the "Today" category on the LifeOS dashboard. Due to the absence of `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and any injected HTML, specific existing dashboard section IDs/classes cannot be referenced, and layout details are based on general dashboard design principles.

### Layout Blocks

The "Today" category will comprise distinct visual blocks, each representing a key area of daily focus. These blocks are expected to be rendered as cards or widgets, potentially adhering to the density modes outlined in `DASHBOARD_WIDGET_DENSITY_SPEC.md`.

1.  **MITs (Most Important Tasks)**
    *   **Purpose:** Display a prioritized list of the user's most critical tasks for the current day.
    *   **Content:** Task title, due date/time (if applicable), status (e.g., complete, in progress), and a quick action (e.g., mark complete).
    *   **Interaction:** Ability to mark tasks as complete, reorder, or quick-add a new MIT.
    *   **Expected Block ID/Class (Hypothetical):** `#today-mits-widget`, `.dashboard-card.mits`

2.  **Schedule**
    *   **Purpose:** Show upcoming appointments, meetings, and scheduled events for the day.
    *   **Content:** Event title, time, duration, location, and participants.
    *   **Interaction:** View event details, join a meeting (if link available).
    *   **Expected Block ID/Class (Hypothetical):** `#today-schedule-widget`, `.dashboard-card.schedule`

3.  **Alerts**
    *   **Purpose:** Display time-sensitive notifications, reminders, or system alerts.
    *   **Content:** Alert message, timestamp, severity (e.g., info, warning, critical), and a dismiss action.
    *   **Interaction:** Dismiss individual alerts, view all alerts.
    *   **Expected Block ID/Class (Hypothetical):** `#today-alerts-widget`, `.dashboard-card.alerts`

4.  **Quick Add**
    *   **Purpose:** Provide a streamlined interface for rapidly adding new tasks, events, or notes.
    *   **Content:** Input field (e.g., text area), category selector (e.g., Task, Event, Note, Lumin Entry), and a submit button.
    *   **Interaction:** Type, select category, submit.
    *   **Expected Block ID/Class (Hypothetical):** `#today-quick-add-widget`, `.dashboard-card.quick-add`

5.  **Lumin Entry**
    *   **Purpose:** Facilitate quick journaling or thought capture, potentially linked to the Lumin memory system.
    *   **Content:** Text input field for a short entry, optional tags, and a submit button.
    *   **Interaction:** Type entry, add tags, submit.
    *   **Expected Block ID/Class (Hypothetical):** `#today-lumin-entry-widget`, `.dashboard-card.lumin-entry`

### API Assumptions

The following API endpoints are assumed to support the data requirements and interactions for the "Today" category. These are based on standard RESTful patterns and the existing `Platform Core` domain context, which handles routing.

1.  **MITs**
    *   `GET /api/v1/today/mits`: Retrieve the list of MITs for the current day.
    *   `POST /api/v1/today/mits`: Add a new MIT.
    *   `PATCH /api/v1/today/mits/:id`: Update an existing MIT (e.g., mark complete, reorder).
    *   `DELETE /api/v1/today/mits/:id`: Delete an MIT.

2.  **Schedule**
    *   `GET /api/v1/today/schedule`: Retrieve scheduled events for the current day.
    *   `POST /api/v1/today/schedule`: Add a new event to the schedule.
    *   `PATCH /api/v1/today/schedule/:id`: Update an existing event.

3.  **Alerts**
    *   `GET /api/v1/today/alerts`: Retrieve active alerts for the user.
    *   `PATCH /api/v1/today/alerts/:id/dismiss`: Dismiss a specific alert.

4.  **Quick Add**
    *   `POST /api/v1/today/add`: Generic endpoint for quick adding various item types. Request body would include `type` (e.g., 'task', 'event', 'note', 'lumin') and relevant data.

5.  **Lumin Entry**
    *   `POST /api/v1/today/lumin-entry`: Submit a new Lumin entry.