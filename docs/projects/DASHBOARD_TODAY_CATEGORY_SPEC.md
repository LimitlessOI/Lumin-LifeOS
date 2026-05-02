## Today Category Specification

This specification outlines the layout blocks and API assumptions for the "Today" category on the LifeOS dashboard, referencing existing elements in `public/overlay/lifeos-dashboard.html` and proposing structures for new components.

### 1. Today's MITs (Most Important Tasks)

**Layout Block:**
*   **Card Container:** The existing `<div class="card accent-border-today fade-up delay-1">`
*   **Label:** The existing `<div class="card-label">Today's MITs</div>`
*   **MITs List:** The existing `<div id="mits-list">` will render individual MIT items.
*   **Quick Add Input:** The existing `<input type="text" id="mit-input" placeholder="Add a most important task…">`
*   **Quick Add Button:** The existing `<button class="btn-add" onclick="addMIT()">Add</button>`

**API Assumptions:**
*   **Fetch MITs:** `GET /api/v1/lifeos/commitments?limit=30`
    *   Expected response: `{"commitments": [{"id": "uuid", "text": "MIT description", "is_mit": true, "kept_at": "timestamp" | null}, ...]}`
*   **Add MIT:** `POST /api/v1/lifeos/commitments`
    *   Expected request body: `{"text": "New MIT description", "is_mit": true}`
    *   Expected response: `{"commitment": {"id": "uuid", ...}}`
*   **Toggle MIT Completion:** `POST /api/v1/lifeos/commitments/:id/keep`
    *   Expected request body: `{"kept": true | false}`
    *   Expected response: `{"commitment": {"id": "uuid", "kept_at": "timestamp" | null, ...}}`

### 2. Today's Schedule

**Layout Block:**
*   **Card Container:** The existing `<div class="card accent-border-today fade-up delay-2">`
*   **Label:** The existing `<div class="card-label">Today's Schedule</div>`
*   **Schedule List:** The existing `<div id="cal-list">` will render individual event items.

**API Assumptions:**
*   **Fetch Schedule:** `GET /api/v1/lifeos/engine/calendar/events?days=1&limit=8`
    *   Expected response: `{"events": [{"title": "Event Name", "starts_at": "ISO timestamp"}, ...]}`

### 3. Today's Alerts

**Layout Block:**
*   **Card Container:** A new card, e.g., `<div class="card accent-border-today fade-up delay-X">` (where `delay-X` is an appropriate animation delay). This card would likely be placed in a new `two-col` row or integrated into an existing one.
*   **Label:** `<div class="card-label">Today's Alerts</div>`
*   **Alerts List:** A new container, e.g., `<div id="alerts-list">`, to display a list of active alerts. Each alert item would be a simple `div` or similar structure.

**API Assumptions:**
*   **Fetch Alerts:** `GET /api/v1/lifeos/alerts/today`
    *   Expected response: `{"alerts": [{"id": "uuid", "message": "Alert description", "severity": "info" | "warning" | "critical", "created_at": "ISO timestamp"}, ...]}`
*   **Dismiss Alert:** `POST /api/v1/lifeos/alerts/:id/dismiss`
    *   Expected request body: `{}` (or `{"dismissed": true}`)
    *   Expected response: `{"status": "ok"}`

### 4. Lumin Entry

**Layout Block:**
*   **Card Container:** A new card, e.g., `<div class="card accent-border-mirror fade-up delay-Y">` (where `delay-Y` is an appropriate animation delay). This card would likely be placed in a new `two-col` row, potentially alongside the "Today's Alerts" card.
*   **Label:** `<div class="card-label">Lumin Entry</div>`
*   **Entry Input:** A new input area, e.g., `<div class="lumin-quick-entry">`
    *   Input: `<input type="text" id="lumin-entry-input" placeholder="Quick log a thought or observation…">`
    *   Button: `<button class="btn-add" onclick="addLuminEntry()">Log</button>`

**API Assumptions:**
*   **Create Lumin Entry:** `POST /api/v1/lifeos/lumin/entry`
    *   Expected request body: `{"text": "User's thought or observation", "type": "observation" | "thought" | "reflection" | "question" | "general"}` (type could be optional or inferred).
    *   Expected response: `{"entry": {"id": "uuid", "text": "...", "created_at": "ISO timestamp"}}`