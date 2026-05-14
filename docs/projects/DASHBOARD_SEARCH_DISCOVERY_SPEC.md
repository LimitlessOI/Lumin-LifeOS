# LifeOS Cross-Surface Discovery Specification

## 1. Dashboard to Lumin Contextual Jump

**Goal:** Enable users to seamlessly transition from specific items on the LifeOS Dashboard to a contextual conversation with Lumin, pre-populated with relevant information or a prompt.

**Description:**
When a user interacts with an actionable item on the Dashboard (e.g., an MIT, a Goal, or a Calendar Event), a mechanism should exist to open the Lumin chat interface (`public/overlay/lifeos-chat.html`) with a pre-defined context. This context would inform Lumin to initiate a conversation or display details pertinent to the clicked item.

**Proposed Interaction Flows:**
*   **MITs:** Clicking an MIT on the Dashboard could open Lumin with a prompt like "Tell me more about MIT '[MIT Title]'." or "Help me plan for '[MIT Title]'."
*   **Goals:** Interacting with a Goal widget could open Lumin with "What's my progress on '[Goal Name]'?" or "How can I accelerate '[Goal Name]'?"
*   **Calendar Events:** Tapping an event could lead to Lumin asking "How should I prepare for '[Event Title]' at [Event Time]?"

**Technical Considerations (Defer Implementation):**
*   Dashboard elements would need to be augmented with click handlers that construct a URL or trigger a JavaScript function to open `lifeos-chat.html` with query parameters (e.g., `?contextType=mit&contextId=123`).
*   The `lifeos-chat.html` bootstrap logic would need to parse these query parameters on load and, if present, initiate a chat message or internal Lumin state update.
*   Consider a dedicated Lumin API endpoint for contextual chat initiation (`POST /api/v1/lifeos/chat/contextual`).

## 2. Command Palette Feasibility Study

**Goal:** Evaluate the feasibility of implementing a global, keyboard-driven command palette for quick access to LifeOS functions, navigation, and entity search.

**Description:**
A command palette (e.g., activated by `Cmd+K` or `Ctrl+K`) would provide a unified text input interface for users to:
*   Navigate directly to different LifeOS sections (Dashboard, Lumin, specific widgets).
*   Perform quick actions (e.g., "Add MIT", "Start new chat", "Log a win").
*   Search across various LifeOS entities.

**Feasibility Aspects to Consider (Defer Implementation):**
*   **Technical Overhead:** Integration with existing UI frameworks, global keyboard listener management, performance implications for real-time filtering.
*   **Scope:** Initial set of commands and entities to support.
*   **UI/UX:** Overlay design, accessibility, input parsing, and result display.
*   **Data Access:** How the palette would efficiently query and display results from disparate data sources (MITs, Goals, Events, Chat History).

## 3. Searchable Entities List (MITs/Goals/Events)

**Goal:** Provide a centralized and efficient way for users to search and discover their personal entities (MITs, Goals, Calendar Events) across the LifeOS platform.

**Description:**
This feature would allow users to type a query and receive filtered results for their MITs, Goals, and Events. This could be integrated into the command palette or exist as a standalone search interface.

**Key Requirements (Defer Implementation):**
*   **Unified Search Endpoint:** A backend API endpoint (e.g., `GET /api/v1/lifeos/search/entities?q=<query>`) capable of querying across `commitments` (for MITs), `goals`, and `calendar_events` tables.
*   **Result Display:** Clear, concise presentation of search results, indicating the entity type and providing a link or action to view/interact with the full entity.
*   **Filtering/Sorting:** Basic filtering by entity type (e.g., "show only MITs") and chronological sorting for events.
*   **Indexing Strategy:** Consider efficient database indexing or a dedicated search service for performance.

**Integration Points:**
*   Potentially within the Lumin chat interface (e.g., a `/search` command).
*   As a dedicated search icon/panel on the Dashboard.
*   As a core function of the proposed Command Palette.