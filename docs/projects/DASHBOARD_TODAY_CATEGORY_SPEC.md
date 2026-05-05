The specification is incomplete due to the missing `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file, which would have provided specific context for the "Today" category.

### Specification for Today Category

This document outlines the layout blocks and API assumptions for the "Today" category on the LifeOS dashboard. This category aggregates daily priorities, scheduled events, alerts, and quick entry points for common tasks.

### 1. MITs (Most Important Tasks)

**Layout Block:**
A dedicated card or section displaying a prioritized list of tasks.
-   **Container:** `<div id="lifeos-today-mits" class="dashboard-card">`
-   **Title:** "Most Important Tasks"
-   **Content:** An ordered list of tasks. Each task item should include:
    -   Checkbox for completion.
    -   Task description.
    -   Optional: Due time/date, priority indicator.
-   **Interaction:** Tapping a task might open a detail view; checking completes it.

**API Assumptions:**
-   **Endpoint:** `GET /api/v1/lifeos/today/mits`
    -   **Purpose:** Retrieve the list of MITs for the current day.
    -   **Response:** `[{ id: string, description: string, dueDate: string, priority: number, completed: boolean }]`
-   **Endpoint:** `POST /api/v1/lifeos/today/mits/{id}/complete`
    -   **Purpose:** Mark an MIT as complete.
    -   **Request:** `{ completed: boolean }`
    -   **Response:** `{ success: boolean }`

### 2. Schedule

**Layout Block:**
A card or section displaying upcoming events and appointments for the day.
-   **Container:** `<div id="lifeos-today-schedule" class="dashboard-card">`
-   **Title:** "Schedule"
-   **Content:** A chronological list of events. Each event item should include:
    -   Time range (e.g., "9:00 AM - 10:00 AM").
    -   Event title.
    -   Optional: Location, attendees.
-   **Interaction:** Tapping an event might open a calendar detail view.

**API Assumptions:**
-   **Endpoint:** `GET /api/v1/lifeos/today/schedule`
    -   **Purpose:** Retrieve scheduled events for the current day.
    -   **Response:** `[{ id: string, title: string, startTime: string, endTime: string, location: string }]`

### 3. Alerts

**Layout Block:**
A card or section displaying important notifications, reminders, or system alerts.
-   **Container:** `<div id="lifeos-today-alerts" class="dashboard-card">`
-   **Title:** "Alerts"
-   **Content:** A list of alert messages. Each alert item should include:
    -   Severity indicator (e.g., icon, color).
    -   Alert message.
    -   Optional: Timestamp, action button (e.g., "Dismiss", "View Details").
-   **Interaction:** Tapping an alert might navigate to a relevant section; action buttons trigger specific behaviors.

**API Assumptions:**
-   **Endpoint:** `GET /api/v1/lifeos/today/alerts`
    -   **Purpose:** Retrieve active alerts for the user.
    -   **Response:** `[{ id: string, message: string, type: 'info' | 'warning' | 'error', timestamp: string, actionUrl?: string }]`
-   **Endpoint:** `POST /api/v1/lifeos/today/alerts/{id}/dismiss`
    -   **Purpose:** Dismiss a specific alert.
    -   **Response:** `{ success: boolean }`

### 4. Quick Add

**Layout Block:**
A compact section allowing users to quickly add new tasks, notes, or events without navigating away from the dashboard.
-   **Container:** `<div id="lifeos-today-quick-add" class="dashboard-card">`
-   **Title:** "Quick Add" (or implied by input fields)
-   **Content:**
    -   Input field for a new task (e.g., `<input type="text" placeholder="Add a new task...">`).
    -   Input field for a quick note (e.g., `<textarea placeholder="Jot down a quick note...