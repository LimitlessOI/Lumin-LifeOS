The task asks for a Markdown specification, but the final instruction block and output contract specify HTML code generation. This is a contradiction. I will proceed with the Markdown specification as explicitly requested by the "TASK" and "SPECIFICATION" sections.

---
# Today Category Specification

This document outlines the layout blocks and API assumptions for the "Today" category on the LifeOS dashboard, referencing existing HTML elements and inferred API interactions.

## 1. Most Important Tasks (MITs)

### Layout Blocks
- **Card Container:** `<div class="card accent-border-today fade-up delay-1">`
- **Card Label:** `<div class="card-label">Today's MITs</div>`
- **MITs List Container:** `<div id="mits-list">`
    - **Individual MIT Item:** `<div class="mit-item" data-id="{mit.id}" data-desc="{mit.description}">`
        - **Checkbox:** `<div class="mit-check {m.kept_at?'done':''}">`
        - **Text:** `<div class="mit-text {m.kept_at?'done':''}">`
- **Quick Add Section:** `<div class="quick-add">`
    - **Input Field:** `<input type="text" id="mit-input" placeholder="Add a most important task…">`
    - **Add Button:** `<button class="btn-add" onclick="addMIT()">Add</button>`

### API Assumptions
- **Load MITs:**
    - **Endpoint:** `GET /api/v1/lifeos/commitments?limit=30`
    - **Expected Response:** `{ "commitments": [{ "id": "uuid", "text": "string", "description": "string", "is_mit": true, "kept_at": "datetime | null" }] }`
- **Toggle MIT Status:**
    - **Endpoint:** `POST /api/v1/lifeos/commitments/{id}/keep`
    - **Request Body:** `{ "kept": boolean }`
    - **Expected Response:** `200 OK` (or updated commitment object)
- **Add New MIT:**
    - **Endpoint:** `POST /api/v1/lifeos/commitments`
    - **Request Body:** `{ "text": "string", "is_mit": true }`
    - **Expected Response:** `201 Created` (or new commitment object)

## 2. Today's Schedule

### Layout Blocks
- **Card Container:** `<div class="card accent-border-today fade-up delay-2">`
- **Card Label:** `<div class="card-label">Today's Schedule</div>`
- **Schedule List Container:** `<div id="cal-list">`
    - **Individual Event Row:** `<div class="event-row">`
        - **Event Time (Optional):** `<span class="event-time">`
        - **Event Title:** `<span class="event-title">`

### API Assumptions
- **Load Calendar Events:**
    - **Endpoint:** `GET /api/v1/lifeos/engine/calendar/events?days=1&limit=8`
    - **Expected Response:** `{ "events": [{ "title": "string", "name": "string", "starts_at": "datetime | null", "start_time": "datetime | null" }] }`

## 3. Alerts

### Layout Blocks (Proposed - Not present in `lifeos-dashboard.html`)
- **Card Container:** A new card would be introduced, potentially using `accent-border-today` or `accent-border-conflict` for critical alerts.
    - Example: `<div class="card accent-border-conflict fade-up delay-X">`
- **Card Label:** `<div class="card-label">Alerts</div>`
- **Alerts List Container:** `<div id="alerts-list">`
    - **Individual Alert Item:** A structure similar to `mit-item` or `event-row` would be suitable, displaying the alert message and potentially a timestamp or type.

### API Assumptions (Proposed - No existing API in `lifeos-dashboard.html`)
- **Load Today's Alerts:**
    - **Endpoint:** `GET /api/v1/lifeos/alerts/today` (new endpoint)
    - **Expected Response:** `{ "alerts": [{ "id": "uuid", "message": "string", "type": "string", "timestamp": "datetime" }] }`

## 4. Lumin Entry (Chat with Lumin)

### Layout Blocks
- **Card Container:** `<div class="card accent-border-mirror fade-up delay-5">`
- **Card Label:** `<div class="card-label">Chat with Lumin</div>`
- **Chat Messages Container:** `<div class="chat-messages" id="chat-messages">`
    - **User Message:** `<div class="msg user">`
    - **Assistant Message:** `<div class="msg assistant">`
    - **Ambient Message:** `<div class="msg ambient">`
- **Typing Indicator:** `<div class="typing" id="typing">`
- **Chat Input Row:** `<div class="chat-row">`
    - **Chat Input Field:** `<input type="text" id="chat-input" placeholder="Ask Lumin anything… or tap 🎙 to talk">`
    - **Microphone Button:** `<button class="btn-mic" id="btn-mic">🎙</button>`
    - **Send Button:** `<button class="btn-send" id="send-btn">↑</button>`
- **Voice Footer:** `<div class="voice-footer">`
    - **Speak Replies Toggle:** `<input type="checkbox" id="speak-toggle">`
    - **Voice Status Display:** `<span id="voice-status">`

### API Assumptions
- **Initialize Chat Thread:**
    - **Endpoint:** `POST /api/v1/lifeos/chat/threads/default`
    - **Request Body:** `{}` (empty object)
    - **Expected Response:** `{ "thread": { "id": "uuid" } }` or `{ "id": "uuid" }`
- **Load Message History:**
    - **Endpoint:** `GET /api/v1/lifeos/chat/threads/{threadId}/messages?limit=10`
    - **Expected Response:** `{ "messages": [{ "role": "user | assistant", "content": "string" }] }`
- **Send Message:**
    - **Endpoint:** `POST /api/v1/lifeos/chat/threads/{threadId}/messages`
    - **Request Body:** `{ "message": "string" }`
    - **Expected Response:** `{ "reply": "string" }` or `{ "content": "string" }` (for assistant's response)
- **Check Proactive Nudge (Ambient Mode):**
    - **Endpoint:** `GET /api/v1/lifeos/ambient/nudge`
    - **Expected Response:** `{ "speak": "string | null" }`