# Cross-Surface Discovery Specification

## 1. Jumping from Dashboard to Lumin with Context Hints

**Goal:** Enable seamless transitions from specific dashboard widgets to Lumin chat, carrying relevant context to facilitate deeper interaction or follow-up.

**Proposed Mechanism:**
*   **Dashboard Integration:** Interactive elements (e.g., MIT items, Calendar events, Goal rows, Score tiles) on `public/overlay/lifeos-dashboard.html` will gain a mechanism (e.g., a click, long-press action, or dedicated icon) to "Discuss in Lumin" or "Explore in Lumin".
*   **Contextual URL Parameters:** When activated, the dashboard will navigate to `public/overlay/lifeos-chat.html` with URL parameters encoding the context.
    *   **Format:** `/overlay/lifeos-chat.html?contextType=<type>&contextId=<id>[&contextHint=<encoded_text>]`
    *   **Examples:**
        *   `/overlay/lifeos-chat.html?contextType=mit&contextId=123`
        *   `/overlay/lifeos-chat.html?contextType=goal&contextId=456&contextHint=Review%20Q3%20Revenue%20Goal`
        *   `/overlay/lifeos-chat.html?contextType=event&contextId=789&contextHint=Meeting%20with%20Sarah`
*   **Lumin Behavior on Context Load:**
    1.  **Thread Creation/Selection:** Lumin will check for an existing relevant thread (e.g., a thread previously linked to this MIT/Goal). If none exists, a new thread will be created, potentially in a specific mode (e.g., `planning` for goals, `general` for events).
    2.  **Initial Message/Prompt:** Lumin will automatically generate an initial message or prompt based on the `contextType` and `contextId`, potentially using `contextHint` for richer detail.
        *   Example for MIT: "Let's discuss MIT #123: 'Finish Q3 Report'. What's on your mind about this?"
        *   Example for Goal: "You've jumped here from Goal #456: 'Q3 Revenue Goal'. How can I help you with this?"
    3.  **Pre-populated Input (Optional):** The chat input might be pre-filled with a suggested follow-up question.

## 2. Command Palette Feasibility

**Goal:** Provide a fast, keyboard-driven interface for searching LifeOS entities and triggering common actions across all overlays.

**Proposed Functionality:**
*   **Global Trigger:** A standard keyboard shortcut (e.g., `Cmd+K` on macOS, `Ctrl+K` on Windows/Linux) will open a modal command palette.
*   **Search & Filter:** The palette will allow users to type and instantly filter a list of:
    *   **LifeOS Entities:** MITs, Goals, Calendar Events, Scores (by name/title/description).
    *   **Lumin Threads:** Existing chat conversations (by title, mode, recent messages).
    *   **System Actions:** "Add MIT", "New Lumin Chat", "Open Dashboard", "Toggle Theme", "View Settings", "Run Build Plan", etc.
*   **Action Execution:** Selecting an item from the filtered list will either:
    *   Navigate to the relevant LifeOS overlay/page (e.g., clicking an MIT takes you to the dashboard, clicking a Lumin thread opens it in `lifeos-chat.html`).
    *   Execute a direct action (e.g., "Add MIT" opens the MIT quick-add input on the dashboard or a modal).
*   **Deferral Note:** Implementation requires a global UI component, robust search indexing, and a centralized action dispatcher.

## 3. Searchable Entities List (MITs/Goals/Events)

**Goal:** Establish a unified, platform-wide search capability for core LifeOS entities, accessible via Lumin and the Command Palette.

**Proposed Scope of Searchable Entities:**
*   **Most Important Tasks (MITs):** Searchable by `text`, `description`, `status`.
*   **Goals:** Searchable by `name`, `description`, `current_value`, `target_value`, `unit`.
*   **Calendar Events:** Searchable by `title`, `description`, `time`, `location`.
*   **Life Scores:** Searchable by `name`, `description`.
*   **Lumin Chat Messages/Threads:** Searchable by `content` (messages), `title` (threads), `mode`.

**Proposed Data Exposure/Indexing:**
*   **API Extension:** Existing APIs (`/api/v1/lifeos/commitments`, `/api/v1/lifeos/goals`, `/api/v1/lifeos/calendar/today`, `/api/v1/lifeos/scores`, `/api/v1/lifeos/chat/threads`, `/api/v1/lifeos/chat/messages`) would need to be augmented or a new `/api/v1/lifeos/search` endpoint created to support full-text search across these entity types.
*   **Search Service:** A dedicated search service (e.g., using a search index like Elasticsearch or a database full-text search) would be required to efficiently query across diverse entity types and return unified results.
*   **Result Format:** Search results should include `entityType`, `entityId`, `title/summary`, and a `link` to the relevant overlay/detail view.

**Deferral Note:** This requires significant backend work for indexing and a new search API, as well as frontend integration into the command palette and potentially Lumin's existing search.