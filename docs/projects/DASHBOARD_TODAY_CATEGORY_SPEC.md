## Today Category Specification

This document outlines the layout blocks and API assumptions for the "Today" category on the LifeOS Dashboard, referencing existing elements where applicable and proposing new structures for new features.

### 1. Today's MITs (Most Important Tasks)

**Layout Block:**
*   **Container:** `div.card.accent-border-today`
*   **Label:** `div.card-label` with text "Today's MITs"
*   **MITs List:** `div#mits-list`
    *   Individual MITs: `div.mit-item`
        *   Checkbox: `div.mit-check` (with `done` class for completion)
        *   Text: `div.mit-text` (with `done` class for completion)
*   **Quick Add (MIT-specific):** `div.quick-add`
    *   Input: `input#mit-input`
    *   Button: `button.btn-add`

**API Assumptions:**
*   **Fetch MITs:** `GET /api/v1/lifeos/commitments?limit=30`
    *   Expected response: `{ commitments: [{ id, text, is_mit, kept_at }] }`
*   **Toggle MIT Completion:** `POST /api/v1/lifeos/commitments/{id}/keep`
    *   Body: `{ kept: boolean }`
*   **Add New MIT:** `POST /api/v1/lifeos/commitments`
    *   Body: `{ text: string, is_mit: true }`

### 2. Today's Schedule

**Layout Block:**
*   **Container:** `div.card.accent-border-today`
*   **Label:** `div.card-label` with text "Today's Schedule"
*   **Schedule List:** `div#cal-list`
    *   Individual Events: `div.event-row`
        *   Time: `span.event-time`
        *   Title: `span.event-title`

**API Assumptions:**
*   **Fetch Schedule:** `GET /api/v1/lifeos/engine/calendar/events?days=1&limit=8`
    *   Expected response: `{ events: [{ id, title, starts_at }] }`

### 3. Alerts

**Layout Block:**
*   **Container:** A new `div.card` element.
    *   Proposed class: `accent-border-today` (or a new accent color if defined for alerts).
    *   Proposed placement: Within the first `div.two-col` row, potentially replacing or alongside an existing card, or in a new row dedicated to "Today" items.
*   **Label:** `div.card-label` with text "Alerts"
*   **Alerts List:** A new `div` element, e.g., `div#alerts-list`.
    *   Individual Alerts: A new `div` element, e.g., `div.alert-item`.
        *   Icon/Indicator: `span.alert-icon`
        *   Message: `span.alert-message`
        *   Timestamp (optional): `span.alert-time`

**API Assumptions:**
*   **Fetch Alerts:** `GET /api/v1/lifeos/alerts`
    *   Expected response: `{ alerts: [{ id, message, type, created_at }] }`
*   **Dismiss Alert:** `POST /api/v1/lifeos/alerts/{id}/dismiss`

### 4. General Quick Add

**Layout Block:**
*   **Container:** A new `div.card` element.
    *   Proposed class: `accent-border-today`.
    *   Proposed placement: As a standalone card, or integrated into a "Today" focused section.
*   **Label:** `div.card-label` with text "Quick Add"
*   **Input Area:** A new `div` element, e.g., `div.general-quick-add-input`.
    *   Input: `input#general-quick-add-input` with placeholder "Add anything..."
    *   Button: `button#btn-general-add` with text "Add"

**API Assumptions:**
*   **Process General Input:** `POST /api/v1/lifeos/quick-add`
    *   Body: `{ text: string }`
    *   Expected behavior: Backend interprets the text (e.g., "add meeting tomorrow 3pm", "note to self: call mom") and routes it to the appropriate service (calendar, notes, etc.).

### 5. Lumin Entry (Chat)

**Layout Block:**
*   **Container:** `div.card.accent-border-mirror`
*   **Label:** `div.card-label` with text "Chat with Lumin"
*   **Chat Messages Display:** `div#chat-messages`
    *   User Message: `div.msg.user`
    *   Assistant Message: `div.msg.assistant`
    *   Ambient Message: `div.msg.ambient`
*   **Typing Indicator:** `div#typing`
*   **Chat Input Row:** `div.chat-row`
    *   Input: `input#chat-input`
    *   Microphone Button: `button#btn-mic`
    *   Send Button: `button#send-btn`
*   **Voice Footer:** `div.voice-footer`
    *   Speak Replies Toggle: `input#speak-toggle`
    *   PTT Hint: `span.ptt-hint`
    *   Voice Status: `span#voice-status`

**API Assumptions:**
*   **Initialize Chat Thread:** `POST /api/v1/lifeos/chat/threads/default`
    *   Expected response: `{ thread: { id } }`
*   **Fetch Chat Messages:** `GET /api/v1/lifeos/chat/threads/{threadId}/messages?limit=10`
    *   Expected response: `{ messages: [{ role, content }] }`
*   **Send Chat Message:** `POST /api/v1/lifeos/chat/threads/{threadId}/messages`
    *   Body: `{ message: string }`
    *   Expected response: `{ reply: string }`
*   **Ambient Nudge:** `GET /api/v1/lifeos/ambient/nudge`
    *   Expected response: `{ speak: string | null }`