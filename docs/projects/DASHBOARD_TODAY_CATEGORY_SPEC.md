The task requests a Markdown specification, but the "HTML FULL FILE — STRICT OUTPUT CONTRACT" section implies an HTML output. I will proceed with the Markdown specification as explicitly requested by the "SPECIFICATION" line for this task.

# Today Category Specification

This document outlines the layout blocks and API assumptions for the "Today" category on the LifeOS dashboard, referencing existing elements in `public/overlay/lifeos-dashboard.html`.

## 1. Most Important Tasks (MITs)

### Layout Block
- **Container**: `<div class="card accent-border-today fade-up delay-1">`
- **Label**: `<div class="card-label">Today's MITs</div>`
- **MITs List**: `<div id="mits-list">` (Populated with `.mit-item` elements)
    - Each MIT item: `<div class="mit-item" data-id="..." data-desc="...">`
        - Checkbox: `<div class="mit-check">` (with SVG for checkmark)
        - Text: `<div class="mit-text">`
- **Quick Add Section**: `<div class="quick-add">`
    - Input field: `<input type="text" id="mit-input" placeholder="Add a most important task…">`
    - Add button: `<button class="btn-add" onclick="addMIT()">Add</button>`

### API Assumptions
- **Load MITs**: `GET /api/v1/lifeos/commitments?limit=30`
    - Expected response: `{"commitments": [{"id": "uuid", "text": "string", "description": "string", "is_mit": true, "kept_at": "ISO string | null"}]}`
- **Toggle MIT Status**: `POST /api/v1/lifeos/commitments/{id}/keep`
    - Request body: `{"kept": boolean}`
- **Add New MIT**: `POST /api/v1/lifeos/commitments`
    - Request body: `{"text": "string", "is_mit": true}`

## 2. Today's Schedule

### Layout Block
- **Container**: `<div class="card accent-border-today fade-up delay-2">`
- **Label**: `<div class="card-label">Today's Schedule</div>`
- **Events List**: `<div id="cal-list">` (Populated with `.event-row` elements)
    - Each event item: `<div class="event-row">`
        - Time: `<span class="event-time">` (optional)
        - Title: `<span class="event-title">`

### API Assumptions
- **Load Schedule**: `GET /api/v1/lifeos/engine/calendar/events?days=1&limit=8`
    - Expected response: `{"events": [{"title": "string", "name": "string", "starts_at": "ISO string", "start_time": "ISO string"}]}`

## 3. Alerts (New Section)

### Layout Block
- **Container**: `<div class="card accent-border-decisions fade-up delay-X">` (New card, `delay-X` to be determined based on placement)
- **Label**: `<div class="card-label">Alerts</div>`
- **Alerts List**: `<div id="alerts-list">` (New ID, populated with alert items)
    - Each alert item: `<div class="alert-item">` (New class)
        - Message: `<span class="alert-message">`
        - Timestamp: `<span class="alert-timestamp">`
        - Optional action: `<a href="..." class="alert-action">`

### API Assumptions
- **Load Alerts**: `GET /api/v1/lifeos/alerts/today` (New API endpoint)
    - Expected response: `{"alerts": [{"id": "uuid", "type": "info|warning|critical", "message": "string", "timestamp": "ISO string", "action_url": "string | null"}]}`

## 4. Lumin Entry (Chat Interface)

### Layout Block
- **Container**: `<div class="card accent-border-mirror fade-up delay-9">`
- **Label**: `<div class="card-label">Chat with Lumin</div>`
- **Messages Display**: `<div class="chat-messages" id="chat-messages">` (Populated with `.msg` elements)
    - User message: `<div class="msg user">`
    - Assistant message: `<div class="msg assistant">`
    - Ambient message: `<div class="msg ambient">`
- **Typing Indicator**: `<div class="typing" id="typing">` (Contains `.typing-dot` elements)
- **Chat Input Row**: `<div class="chat-row">`
    - Input field: `<input type="text" id="chat-input" placeholder="Ask Lumin anything… or tap 🎙 to talk">`
    - Microphone button: `<button class="btn-mic" id="btn-mic">🎙</button>`
    - Send button: `<button class="btn-send" id="send-btn">↑</button>`
- **Voice Footer**: `<div class="voice-footer">`
    - Speak replies toggle: `<label><input type="checkbox" id="speak-toggle"><span>Speak replies</span></label>`
    - PTT hint: `<span class="ptt-hint">Hold Space to talk</span>`
    - Voice status: `<span id="voice-status">`

### API Assumptions
- **Initialize Chat Thread**: `POST /api/v1/lifeos/chat/threads/default`
    - Expected response: `{"thread": {"id": "uuid"}}` or `{"id": "uuid"}`
- **Load Chat History**: `GET /api/v1/lifeos/chat/threads/{threadId}/messages?limit=10`
    - Expected response: `{"messages": [{"role": "user|assistant", "content": "string"}]}`
- **Send Message**: `POST /api/v1/lifeos/chat/threads/{threadId}/messages`
    - Request body: `{"message": "string"}`
    - Expected response: `{"reply": "string"}` or `{"content": "string"}`
- **Proactive Nudge**: `GET /api/v1/lifeos/ambient/nudge`
    - Expected response: `{"speak": "string"}` (if a nudge is available) or `{}`