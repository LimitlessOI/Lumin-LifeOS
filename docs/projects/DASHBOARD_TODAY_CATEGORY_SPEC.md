The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file is missing from the repository, leading to an incomplete specification for the overall dashboard context.
---
# Today Category Specification

This document outlines the layout blocks and API assumptions for the "Today" category on the LifeOS dashboard. This category aggregates immediate, actionable items relevant to the current day.

## 1. Layout Blocks

The "Today" category will be rendered within a dedicated section of the main dashboard container, adapting to the global `data-density` attribute. Each functional area within "Today" will be represented as a distinct widget.

### 1.1. Main Container
-   **DOM Element:** `<section id="today-category-section" class="dashboard-category-section">`
-   **Purpose:** Houses all "Today" related widgets. This section will be a direct child of the main dashboard container (e.g., `<div id="dashboard-main" data-density="...">`).

### 1.2. MITs (Most Important Tasks) Widget
-   **DOM Element:** `<div id="today-mits-widget" class="dashboard-widget" data-widget-type="mits">`
-   **Purpose:** Displays a prioritized list of the user's Most Important Tasks for the current day.
-   **Content:** Each MIT entry will typically include a title, status indicator (e.g., checkbox), and potentially a due time or priority level.

### 1.3. Schedule Widget
-   **DOM Element:** `<div id="today-schedule-widget" class="dashboard-widget" data-widget-type="schedule">`
-   **Purpose:** Presents a chronological list of upcoming appointments or events for the current day.
-   **Content:** Each schedule entry will include a time range, title, and optionally a location or participants.

### 1.4. Alerts Widget
-   **DOM Element:** `<div id="today-alerts-widget" class="dashboard-widget" data-widget-type="alerts">`
-   **Purpose:** Shows critical notifications, reminders, or system alerts requiring immediate attention.
-   **Content:** Each alert will display a message, type (e.g., info, warning, critical), and a timestamp.

### 1.5. Quick Add Widget
-   **DOM Element:** `<div id="today-quick-add-widget" class="dashboard-widget" data-widget-type="quick-add">`
-   **Purpose:** Provides a streamlined interface for quickly adding new tasks, events, or notes directly from the dashboard.
-   **Content:** An input field, a submission button, and potentially a selector for the type of item being added.

### 1.6. Lumin Entry Widget
-   **DOM Element:** `<div id="today-lumin-widget" class="dashboard-widget" data-widget-type="lumin">`
-   **Purpose:** Offers a quick access point or a summary related to the "Lumin" feature, facilitating rapid interaction.
-   **Content:** Could be a button to initiate a new Lumin entry, or a brief summary of recent Lumin activity.

## 2. API Assumptions

The following API endpoints are assumed for populating the "Today" category widgets. All endpoints are expected to return JSON data.

### 2.1. MITs API
-   **Endpoint:** `GET /api/v1/today/mits`
-   **Description:** Retrieves the list of Most Important Tasks for the current user for today.
-   **Expected Response Structure:**
    ```json
    [
      {
        "id": "string",
        "title": "string",
        "status": "pending" | "completed",
        "dueDate": "string (ISO 8601 date-time)",
        "priority": "number"
      }
    ]
    ```

### 2.2. Schedule API
-   **Endpoint:** `GET /api/v1/today/schedule`
-   **Description:** Fetches the user's schedule entries for the current day.
-   **Expected Response Structure:**
    ```json
    [
      {
        "id": "string",
        "title": "string",
        "startTime": "string (ISO 8601 date-time)",
        "endTime": "string (ISO 8601 date-time)",
        "location": "string | null"
      }
    ]
    ```

### 2.3. Alerts API
-   **Endpoint:** `GET /api/v1/today/alerts`
-   **Description:** Retrieves active alerts and notifications for the user.
-   **Expected Response Structure:**
    ```json
    [
      {
        "id": "string",
        "type": "info" | "warning" | "critical",
        "message": "string",
        "timestamp": "string (ISO 8601 date-time)"
      }
    ]
    ```

### 2.4. Quick Add API
-   **Endpoint:** `POST /api/v1/today/quick-add`
-   **Description:** Allows for rapid creation of new items (tasks, events, notes).
-   **Expected Request Body:**
    ```json
    {
      "type": "task" | "event" | "note",
      "content": "string",
      "dueDate": "string (ISO 8601 date-time) | null",
      "startTime": "string (ISO 8601 date-time) | null"
    }
    ```
-   **Expected Response Structure:**
    ```json
    {
      "success": "boolean",
      "id": "string | null",
      "message": "string"
    }
    ```

### 2.5. Lumin Summary API
-   **Endpoint:** `GET /api/v1/today/lumin-summary`
-   **Description:** Provides a brief summary or status related to the Lumin feature.
-   **Expected Response Structure:**
    ```json
    {
      "latestEntry": {
        "id": "string",
        "title": "string",
        "timestamp": "string (ISO 8601 date-time)"
      } | null,
      "unreadCount": "number"
    }
    ```