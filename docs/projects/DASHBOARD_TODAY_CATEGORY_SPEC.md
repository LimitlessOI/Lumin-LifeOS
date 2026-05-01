The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file could not be read. The output format specification is contradictory; prioritizing Markdown as per explicit 'SPECIFICATION' for this task.

### Today Category Specification

This document outlines the layout blocks and API assumptions for the "Today" category on the LifeOS Dashboard, encompassing MITs, Schedule, Alerts, Quick Add, and Lumin Entry.

#### 1. Today's MITs

*   **Purpose**: Display and manage Most Important Tasks (MITs) for the current day.
*   **Layout Block**:
    *   **HTML Element**: Existing `div.card.accent-border-today` within the first `.two-col` row.
    *   **IDs**:
        *   `mits-list`: Container for individual MIT items.
        *   `mit-input`: Input field for the quick add feature.
*   **API Assumptions**:
    *   `GET /api/v1/lifeos/commitments?limit=30`: Fetches a list of commitments, which are then filtered client-side for `is_mit: true`.
        *   Expected Response: `{ commitments: [{ id: string, text: string, description: string, is_mit: boolean, kept_at: string | null }] }`
    *   `POST /api/v1/lifeos/commitments/{id}/keep`: Toggles the completion status of an MIT.
        *   Request Body: `{ kept: boolean }`
    *   `POST /api/v1/lifeos/commitments`: Adds a new MIT.
        *   Request Body: `{ text: string, is_mit: true }`

#### 2. Today's Schedule

*   **Purpose**: Display calendar events and appointments scheduled for the current day.
*   **Layout Block**:
    *   **HTML Element**: Existing `div.card.accent-border-today` within the first `.two-col` row, adjacent to "Today's MITs".
    *   **ID**: `cal-list`: Container for individual event items.
*   **API Assumptions**:
    *   `GET /api/v1/lifeos/engine/calendar/events?days=1&limit=8`: Fetches calendar events for today.
        *   Expected Response: `{ events: [{ id: string, title: string, name: string, starts_at: string | null, start_time: string | null }] }`

#### 3. Today's Alerts (New Section)

*   **Purpose**: Display important, time-sensitive alerts or notifications relevant to the user's day.
*   **Layout Block**:
    *   **HTML Element**: A new `div.card.accent-border-today` element.
    *   **Placement**: This card will be a full-width block, placed after the existing "Goals + Scores" `.two-col` row and before the "Chat with Lumin" card.
    *   **ID**: `alerts-list`: Container for individual alert items.
*   **API Assumptions**:
    *   `GET /api/v1/lifeos/alerts/today`: Fetches a list of active alerts for the current day.
        *   Expected Response: `{ alerts: [{ id: string, title: string, description: string, type: 'info'|'warning'|'critical', created_at: string }] }`

#### 4. Quick Add (MITs)

*   **Purpose**: Provide a streamlined interface for adding new Most Important Tasks.
*   **Layout Block**:
    *   **HTML Element**: Existing `div.quick-add` nested within the "Today's MITs" card.
    *   **ID**: `mit-input`: Text input field.
*   **API Interactions**: (Refer to "Today's MITs" section for `POST /api/v1/lifeos/commitments`)

#### 5. Lumin Entry (Chat with Lumin)

*   **Purpose**: Facilitate interaction with the Lumin AI assistant via text or voice.
*   **Layout Block**:
    *   **HTML Element**: Existing `div.card.accent-border-mirror` as a full-width block.
    *   **IDs**:
        *   `chat-messages`: Container for chat message history.
        *   `chat-input`: Text input field for messages.
        *   `btn-mic`: Button for voice input (Push-to-Talk).
        *   `send-btn`: Button to send text messages.
*   **API Assumptions**:
    *   `POST /api/v1/lifeos/chat/threads/default`: Initializes or retrieves the default chat thread.
        *   Expected Response: `{ thread: { id: string } | { id: string } }`
    *   `GET /api/v1/lifeos/chat/threads/{threadId}/messages?limit=10`: Fetches recent messages for a given thread.
        *   Expected Response: `{ messages: [{ role: 'user'|'assistant', content: string }] }`
    *   `POST /api/v1/lifeos/chat/threads/{threadId}/messages`: Sends a new message to the AI assistant.
        *   Request Body: `{ message: string }`
        *   Expected Response: `{ reply: string | null, content: string | null }`
    *   `GET /api/v1/lifeos/ambient/nudge`: Fetches proactive nudges from Lumin for ambient mode.
        *   Expected Response: `{ speak: string | null }`