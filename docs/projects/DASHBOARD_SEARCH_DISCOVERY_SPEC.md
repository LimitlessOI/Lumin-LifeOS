The specification is contradictory regarding the overall response format (HTML document) versus the requested specification format (Markdown + ---METADATA--- JSON for a .md file). I am prioritizing the Markdown format for the content of the .md file, as this is a specification task for a Markdown document.

# LifeOS Dashboard & Lumin Cross-Surface Discovery Brief

## 1. Jumping from Dashboard to Lumin with Context Hints

**Goal:** Enable seamless transition from specific entities on the LifeOS Dashboard (MITs, Goals, Calendar Events) directly into a relevant Lumin chat conversation, pre-populating context for Lumin.

**User Flow:**
1.  User views an MIT, Goal, or Calendar Event on the Dashboard.
2.  User performs an action (e.g., a dedicated "Discuss with Lumin" button, or a long-press context menu option) on a specific entity.
3.  Lumin chat overlay opens (or navigates to the Lumin chat page if not an overlay).
4.  Lumin receives the context of the selected entity (e.g., MIT ID, Goal Name, Event Title, Description).
5.  Lumin initiates a conversation, acknowledging the context (e.g., "You wanted to discuss your MIT: 'Finish Q3 Report'. How can I help you with this?").

**Technical Considerations (Defer Implementation):**
*   Define a URL scheme or API endpoint for Lumin to receive context (e.g., `/lumin/chat?contextType=mit&id=123`).
*   Determine the data structure for passing entity context (ID, type, relevant fields).
*   Lumin's internal logic needs to parse this context and generate an appropriate opening prompt.

## 2. Command Palette Feasibility

**Goal:** Explore the feasibility of a global, keyboard-triggered command palette for quick access to LifeOS features and information.

**Concept:** A modal interface, activated by a keyboard shortcut (e.g., `Cmd+K` or `Ctrl+K`), that allows users to:
*   **Search:** Find MITs, Goals, Calendar Events, Notes, Contacts, etc.
*   **Execute Quick Actions:** "Add new MIT", "Schedule event", "Start a new Lumin chat", "Log a reflection".
*   **Navigate:** Jump to specific dashboard sections or Lumin chat modes.

**Technical Considerations (Defer Implementation):**
*   Identify a suitable UI/UX pattern for the command palette.
*   Determine the scope of searchable entities and executable commands.
*   Consider performance implications for real-time search across various data sources.
*   Evaluate existing libraries or build custom solution.

## 3. Searchable Entities List (MITs/Goals/Events)

**Goal:** Provide a unified and efficient way for users to search across their core LifeOS entities (MITs, Goals, Calendar Events) from a central location.

**Functionality:**
*   A single search input field that queries across multiple entity types.
*   Results should be grouped by entity type or ranked by relevance.
*   Each search result should provide enough context to identify the item and a link to navigate to its detail view or open it in Lumin.

**Technical Considerations (Defer Implementation):**
*   Design a backend API endpoint capable of performing a federated search across `commitments`, `goals`, and `calendar_events` tables.
*   Implement indexing strategies if performance becomes an issue with large datasets.
*   Define a consistent display format for search results from different entity types.
*   Consider fuzzy matching and natural language processing for improved search experience.