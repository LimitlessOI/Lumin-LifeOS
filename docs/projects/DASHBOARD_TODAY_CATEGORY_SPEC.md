The `TASK` and `SPECIFICATION` explicitly request a Markdown document, but the `HTML FULL FILE — STRICT OUTPUT CONTRACT` demands a complete HTML document with no prose. I am prioritizing the explicit `TASK` and `SPECIFICATION` for the content and format of this output.

# Today Category Specification

This document outlines the layout blocks and API assumptions for the "Today" category on the LifeOS Dashboard. The "Today" category aggregates daily essential information and interaction points.

## 1. Today's MITs (Most Important Tasks)

**Purpose:** Displays a user's top priority tasks for the day, allowing for quick completion and addition.
**Layout Block:**
-   **Existing Section:** The primary layout is within the `div.card.accent-border-today` in the first `two-col` row, specifically targeting `div#mits-list` for the list of MITs and `div.quick-add` for the input field.
-   **Structure:**
    ```html
    <div class="card accent-border-today fade-up delay-1">
        <div class="card-label">Today's MITs</div>
        <div id="mits-list">
            <!-- MIT items rendered here -->
            <div class="mit-item" data-id="{id}" data-desc="{description}">
                <div class="mit-check {done_class}">
                    <svg>...</svg>
                </div>
                <div class="mit-text {done_class}">{text}</div>
            </div>
        </div>
        <div class="quick-add">
            <input type="text" id="mit-input" placeholder="Add a most important task…">
            <button class="btn-add" onclick="addMIT()">Add</button>
        </div>
    </div>
    ```
**API Assumptions:**
-   **Load MITs:** `GET /api/v1/lifeos/commitments?limit=30`
    -   Expected Response: `{"commitments": [{"id": "uuid", "text": "Task description", "description": "Longer description", "is_mit": true, "kept_at": "timestamp | null"}]}`
-   **Toggle MIT Completion:** `POST /api/v1/lifeos/commitments/{id}/keep` (to mark as kept) or `DELETE /api/v1/lifeos/commitments/{id}/keep` (to unmark as kept)
    -   Expected Response: `200 OK`
-   **Add MIT:** `POST /api/v1/lifeos/commitments`
    -   Request Body: `{"text": "New MIT text", "is_mit": true}`
    -   Expected Response: `201 Created` with the new commitment object.

## 2. Today's Schedule

**Purpose:** Displays a chronological list of events and appointments for the current day.
**Layout Block:**
-   **Existing Section:** The primary layout is within the `div.card.accent-border-today` in the first `two-col` row, specifically targeting `div#cal-list`.
-   **Structure:**
    ```html
    <div class="card accent-border-today fade-up delay-2">
        <div class="card-label">Today's Schedule</div>
        <div id="cal-list">
            <!-- Event items rendered here -->
            <div class="event-row">
                <div class="event-time">{time}</div>
                <div class="event-title">{title}</div>
            </div>
        </div>
    </div>
    ```
**API Assumptions:**
-   **Load Schedule:** `GET /api/v1/lifeos/calendar/today`
    -   Expected Response: `{"events": [{"time": "HH:MM", "title": "Event Title"}]}`

## 3. Today's Alerts

**Purpose:** Displays time-sensitive notifications, reminders, or system alerts relevant to the user's immediate attention.
**Layout Block:**
-   **Proposed New Section:** A new `div.card` within a `two-col` row. This could potentially occupy the `div#lifeos-widget-category-stubs` slot if it's a general "category stub" for alerts, or a new dedicated card.
-   **Structure (Example, assuming a new card):**
    ```html
    <div class="card accent-border-today fade-up delay-X" id="alerts-card">
        <div class="card-label">Alerts</div>
        <div id="alerts-list">
            <!-- Alert items rendered here -->
            <div class="alert-item">
                <span class="alert-icon">🔔</span>
                <span class="alert-text">{message}</span>
                <button class="alert-dismiss">✕</button>
            </div>
        </div>
        <!-- Optional: "View All" link -->
    </div>
    ```
**API Assumptions:**
-   **Load Alerts:** `GET /api/v1/lifeos/alerts/today`
    -   Expected Response: `{"alerts": [{"id": "uuid", "message": "Alert message", "type": "reminder | system", "timestamp": "ISOString"}]}`
-   **Dismiss Alert:** `POST /api/v1/lifeos/alerts/{id}/dismiss`
    -   Expected Response: `200 OK`

## 4. Quick Add (General Purpose)

**Purpose:** Provides a single input field for quickly adding various types of information (e.g., notes, tasks, events) which Lumin can interpret and process. This is distinct from the MIT-specific quick add.
**Layout Block:**
-   **Proposed New Section:** This could be integrated into the `div#lifeos-widget-lumin-quick` widget, or a standalone card. Given the `lifeos-widget-lumin-quick.js` script is loaded, it's likely part of that widget.
-   **Structure (Example, as part of `lifeos-widget-lumin-quick`):**
    ```html
    <div id="lifeos-widget-lumin-quick" class="dashboard-widget card accent-border-mirror fade-up delay-5">
        <div class="card-label">Quick Lumin Entry</div>
        <div class="quick-lumin-input">
            <input type="text" id="lumin-quick-add-input" placeholder="Ask Lumin or quickly add anything...">
            <button class="btn-lumin-quick-send">→ </button>
        </div>
        <!-- Optional: Quick action buttons (e.g., "Add Task", "Log Note") -->
    </div>
    ```
**API Assumptions:**
-   **Process Quick Add:** `POST /api/v1/lifeos/lumin/quick-add`
    -   Request Body: `{"text": "User input string"}`
    -   Expected Response: `200 OK` with a confirmation or processed item details. Lumin would parse the intent.

## 5. Lumin Entry (Structured Interaction)

**Purpose:** Provides a dedicated, possibly more structured, entry point for interacting with Lumin beyond simple chat, potentially for specific commands or data input. This could be the `lifeos-widget-lumin-quick` itself, or a more advanced version.
**Layout Block:**
-   **Existing Placeholder:** `div#lifeos-widget-lumin-quick` is the designated slot for a quick Lumin interaction widget.
-   **Structure (Example, building on `lifeos-widget-lumin-quick`):**
    ```html
    <div id="lifeos-widget-lumin-quick" class="dashboard-widget card accent-border-mirror fade-up delay-5">
        <div class="card-label">Lumin Actions</div>
        <!-- Could contain the Quick Add input from above, plus specific action buttons -->
        <div class="lumin-action-buttons">
            <button class="btn-lumin-action" data-action="log-mood">Log Mood</button>
            <button class="btn-lumin-action" data-action="start-focus">Start Focus</button>
            <button class="btn-lumin-action" data-action="review-day">Review Day</button>
        </div>
        <!-- Or a more advanced input for specific commands -->
    </div>
    ```
**API Assumptions:**
-   **Execute Lumin Action:** `POST /api/v1/lifeos/lumin/action`
    -   Request Body: `{"action": "log-mood", "data": {"mood": "happy"}}` or `{"action": "start-focus", "duration": 30}`
    -   Expected Response: `200 OK` with action confirmation.
-   **General Lumin Query (if distinct from chat):** `POST /api/v1/lifeos/lumin/query`
    -   Request Body: `{"query": "What's my next meeting?"}`
    -   Expected Response: `200 OK` with Lumin's response.