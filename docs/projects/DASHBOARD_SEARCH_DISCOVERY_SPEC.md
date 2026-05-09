# Cross-Surface Discovery Specification

This document specifies features for enhancing user discovery and navigation across the LifeOS Dashboard and Lumin chat interfaces, focusing on contextual jumps, a command palette, and searchable entities.

## 1. Jumping from Dashboard to Lumin with Context Hints

**Goal:** Enable seamless transitions from the LifeOS Dashboard to the Lumin chat, carrying relevant contextual information to pre-populate or inform the conversation.

**Description:**
Users will be able to initiate a chat with Lumin directly from the Dashboard, and the Lumin interface will automatically display or suggest prompts based on the user's current view or interactions on the Dashboard.

**Contextual Data Points to Transfer:**
*   **Most Important Tasks (MITs):** Currently displayed MITs, especially those recently interacted with (e.g., marked complete, long-pressed for description).
*   **Today's Schedule/Events:** Upcoming events from the calendar widget.
*   **Life Scores:** Current scores and their associated categories (e.g., Health, Integrity).
*   **Goals:** Progress and details of active goals.
*   **General Dashboard State:** A high-level summary of the dashboard's current data (e.g., "You have 2 pending MITs and a Health Score of 75").

**Mechanism:**
1.  **Dashboard Trigger:** A dedicated "Chat with Lumin" button or icon will be added to the Dashboard, likely near the existing chat widget or header controls.
2.  **URL Parameter / Local Storage:** When the trigger is activated, the Dashboard will construct a payload of relevant context. This payload will be encoded and passed to `public/overlay/lifeos-chat.html` either as a URL query parameter (e.g., `?context=...`) or stored temporarily in `localStorage` with a unique key.
3.  **Lumin Context Parsing:** `public/overlay/lifeos-chat.html` will include new JavaScript logic to:
    *   Check for and parse the incoming context payload on `DOMContentLoaded`.
    *   If context is present, populate the existing `context-bar` (`#context-bar`) with "context pills" representing the transferred data (e.g., "MIT: 'Finish Project X'", "Health Score: 75").
    *   Optionally, pre-fill the `#chat-input` with a suggested prompt based on the context (e.g., "Tell me more about my MIT 'Finish Project X'").
    *   Clear the temporary context from `localStorage` or URL after use to prevent stale data.

**Example Flow:**
*   User long-presses an MIT on the Dashboard.
*   A "Chat about this MIT" option appears.
*   Clicking it opens `lifeos-chat.html` with `?context=mit_id:123,mit_text:'Finish Project X'`.
*   Lumin's chat input is pre-filled with "Lumin, tell me more about 'Finish Project X'." and a context pill "MIT: Finish Project X" appears in the context bar.

## 2. Command Palette Feasibility

**Goal:** Evaluate the feasibility of implementing a system-wide command palette for rapid access to actions and information.

**Description:**
A command palette (e.g., activated by `Cmd+K` or `Ctrl+K`) would provide a quick, searchable interface for users to execute common actions, navigate, or retrieve information without needing to click through menus.

**Initial Scope (Feasibility Study):**
*   **Activation:** Global keyboard shortcut (`Cmd+K` / `Ctrl+K`).
*   **Interface:** A modal overlay that appears centered on the screen with a search input.
*   **Searchable Actions/Entities:**
    *   **Dashboard Actions:** "Add MIT", "Toggle Theme", "Toggle Ambient Mode".
    *   **Lumin Actions:** "New Chat", "Change Mode (General, Mirror, Coach, etc.)", "Toggle Build Panel".
    *   **Navigation:** "Go to Dashboard", "Go to Lumin".
    *   **Search Entities:** (See Section 3) "Search MITs", "Search Goals", "Search Events".
*   **Technical Considerations:**
    *   **Global Event Listener:** A single listener for the keyboard shortcut.
    *   **UI Component:** A reusable modal component for the palette.
    *   **Fuzzy Search:** Client-side fuzzy matching for commands and entities.
    *   **Action Dispatch:** A centralized mechanism to map search results to JavaScript functions or URL navigations.
    *   **Context Awareness:** Potentially, the palette could offer context-sensitive actions based on the active page (e.g., more Dashboard-specific actions when on the Dashboard).

**Deferral:** This task focuses on specifying the concept and feasibility. Implementation of the command palette itself is deferred.

## 3. Searchable Entities List (MITs/Goals/Events)

**Goal:** Provide a unified search capability for key user entities (MITs, Goals, Events) across the platform.

**Description:**
Users need a way to quickly find specific commitments, objectives, or scheduled items. This search could be integrated into the command palette (Section 2) or offered as a dedicated search feature within the Dashboard or Lumin.

**Search Scope and Data Sources:**
*   **Most Important Tasks (MITs):**
    *   **Searchable Fields:** `text`, `description`, `status` (e.g., "done", "pending").
    *   **API Endpoint:** Leverage or extend `/api/v1/lifeos/commitments` with search parameters.
*   **Goals:**
    *   **Searchable Fields:** `name`, `description`, `category`.
    *   **API Endpoint:** Leverage or extend `/api/v1/lifeos/finance/goals` with search parameters.
*   **Calendar Events:**
    *   **Searchable Fields:** `title`, `description`, `location`, `starts_at` (date range).
    *   **API Endpoint:** Leverage or extend `/api/v1/lifeos/engine/calendar/events` with search parameters.

**Integration Points:**
*   **Command Palette:** Search results from these entities would appear directly in the command palette, allowing users to jump to details or interact with the found item.
*   **Lumin Chat:** The existing message search panel (`#search-panel` in `public/overlay/lifeos-chat.html`) could be extended to include these entity types, or a new dedicated entity search panel could be introduced.
*   **Dashboard:** A search input could be added to the Dashboard header, providing quick access to these entities.

**Technical Considerations:**
*   **Backend API:** New or extended API endpoints will be required to perform efficient server-side searches across these entity types, returning relevant metadata.
*   **Client-Side Rendering:** Display search results clearly, indicating the entity type (MIT, Goal, Event) and providing a link or action to view/interact with the full entity.
*   **Result Prioritization:** Consider how to prioritize results when a search query matches multiple entity types.