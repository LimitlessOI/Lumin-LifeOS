The specification is incomplete due to the missing `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file.

# Today Category Specification

This document outlines the layout blocks and API assumptions for the "Today" category on the LifeOS dashboard, based on the provided `public/overlay/lifeos-dashboard.html` and `docs/projects/DASHBOARD_WIDGET_DENSITY_SPEC.md`.

## 1. Today's MITs (Most Important Tasks)

**Layout Block:**
- The "Today's MITs" section is contained within a `div` with classes `card accent-border-today fade-up delay-1`.
- **MITs List:** `div#mits-list` holds individual MIT items.
- **Quick Add:** `div.quick-add` contains the input field and button for adding new MITs.
    - Input field: `input#mit-input`
    - Add button: `button.btn-add`

**API Assumptions:**
- **Fetch MITs:** `GET /api/v1/lifeos/commitments?limit=30`
    - Expected response: `{ commitments: [{ id: string, text: string, description: string, is_mit: boolean, kept_at: string|null }] }`
- **Toggle MIT Completion:** `POST /api/v1/lifeos/commitments/{id}/keep`
    - Request body: `{ kept: boolean }`
- **Add New MIT:** `POST /api/v1/lifeos/commitments`
    - Request body: `{ text: string, is_mit: true }`

## 2. Today's Schedule

**Layout Block:**
- The "Today's Schedule" section is contained within a `div` with classes `card accent-border-today fade-up delay-2`.
- **Schedule List:** `div#cal-list` holds individual event rows.
    - Event row: `div.event-row`
    - Event time: `span.event-time`
    - Event title: `span.event-title`

**API Assumptions:**
- **Fetch Schedule:** `GET /api/v1/lifeos/engine/calendar/events?days=1&limit=8`
    - Expected response: `{ events: [{ title: string, name: string, starts_at: string, start_time: string }] }`

## 3. Lumin Entry (Chat with Lumin)

**Layout Block:**
- The "Chat with Lumin" section is contained within a `div` with classes `card accent-border-mirror fade-up delay-5`.
- **Chat Messages:** `div#chat-messages` displays the conversation history.
    - User message: `div.msg.user`
    - Assistant message: `div.msg.assistant`
    - Ambient message: `div.msg.ambient`
- **Typing Indicator:** `div#typing` shows when Lumin is typing.
- **Chat Input Row:** `div.chat-row` contains the input field and action buttons.
    - Chat input: `input#chat-input`
    - Microphone button: `button#btn-mic`
    - Send button: `button#send-btn`
- **Voice Footer:** `div.voice-footer` provides voice-related controls and status.
    - Speak replies toggle: `input#speak-toggle`
    - Voice status: `span#voice-status`

**API Assumptions:**
- **Initialize Chat Thread:** `POST /api/v1/lifeos/chat/threads/default`
    - Request body: `{}`
    - Expected response: `{ thread: { id: string } }` or `{ id: string }`
- **Fetch Chat History:** `GET /api/v1/lifeos/chat/threads/{threadId}/messages?limit=10`
    - Expected response: `{ messages: [{ role: 'user'|'assistant', content: string }] }`
- **Send Message:** `POST /api/v1/lifeos/chat/threads/{threadId}/messages`
    - Request body: `{ message: string }`
    - Expected response: `{ reply: string }` or `{ content: string }`
- **Fetch Ambient Nudge:** `GET /api/v1/lifeos/ambient/nudge`
    - Expected response: `{ speak: string|null }`

## 4. Alerts

No explicit "alerts" layout block or section is visible in the provided `public/overlay/lifeos-dashboard.html`. If alerts are to be implemented, they would require a new dedicated card or integration into existing card structures (e.g., as badges or inline messages within MITs or Schedule items).

## 5. Widget Density Integration

As per `docs/projects/DASHBOARD_WIDGET_DENSITY_SPEC.md`, the visual density of all dashboard cards, including those in the "Today" category, will be controlled by a `data-density` attribute on the `body` element. This will dynamically adjust CSS variables such as `--dash-card-padding-x`, `--dash-card-padding-y`, `--dash-card-margin-bottom`, `--dash-card-label-margin-bottom`, `--dash-font-size-card-label`, `--dash-font-size-card-content`, and `--dash-radius-lg`.