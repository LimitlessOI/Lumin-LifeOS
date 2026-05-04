# Project Brief: Cross-Surface Discovery for LifeOS Dashboard

## 1. Jumping from Dashboard to Lumin with Context Hints

**Objective:** Enable seamless navigation from the LifeOS Dashboard to the Lumin interface, carrying relevant contextual information to enhance user experience and reduce friction.

**Description:** When a user is viewing specific entities (e.g., an MIT, a Goal, an Event) on the LifeOS Dashboard, they should have the option to "jump" to the Lumin interface, where the corresponding entity or related information is pre-selected, highlighted, or filtered. This reduces the need for users to manually re-locate information across different surfaces.

**Requirements:**
*   **Contextual Links/Buttons:** Dashboard UI elements (e.g., MIT cards, Goal details) should include clear affordances (buttons, links) to navigate to Lumin.
*   **Parameter Passing:** The navigation mechanism must support passing entity identifiers (e.g., `mitId`, `goalId`, `eventId`) and potentially other relevant filters (e.g., `dateRange`, `status`) as URL parameters or via a client-side routing mechanism.
*   **Lumin Reception:** Lumin must be capable of parsing these incoming parameters and adjusting its view state accordingly (e.g., opening a specific detail panel, applying a search filter, highlighting an item).
*   **Error Handling:** If the context passed is invalid or the entity does not exist in Lumin, appropriate feedback should be provided to the user.

**Considerations:**
*   Define a clear URL parameter schema for Lumin to ensure consistent context passing.
*   Evaluate the security implications of passing sensitive context via URLs.
*   Determine the scope of entities that will support this cross-surface jump initially.

## 2. Command Palette Feasibility

**Objective:** Assess the viability of implementing a global command palette within the LifeOS Dashboard to provide quick access to actions, navigation, and search functionalities.

**Description:** A command palette offers a keyboard-driven interface for users to execute commands, navigate to different sections, or initiate searches without needing to interact with traditional UI elements. This can significantly improve efficiency for power users.

**Feasibility Assessment Points:**
*   **Scope of Commands:** Identify a preliminary list of high-value commands (e.g., "Create New MIT," "Search Goals," "Open Builder," "View My Profile," "Toggle Dark Mode").
*   **Technical Integration:**
    *   How would the command palette integrate with the existing UI framework (e.g., React, Vue)?
    *   What backend services would be required to support command execution (e.g., API endpoints for creation, search)?
    *   How would it handle dynamic commands (e.g., context-sensitive actions)?
*   **User Experience:**
    *   What keyboard shortcut would activate it?
    *   How would results be displayed and filtered?
    *   Consider accessibility requirements.
*   **Maintenance Overhead:** Evaluate the effort required to maintain and extend the list of commands over time.

**Recommendation (to be determined after assessment):** Based on the above, a recommendation will be made regarding the implementation of a command palette, including a phased rollout if deemed feasible.

## 3. Searchable Entities List (MITs/Goals/Events)

**Objective:** Provide a unified and efficient search mechanism for core LifeOS entities: Most Important Tasks (MITs), Goals, and Events.

**Description:** Users need a way to quickly find specific MITs, Goals, or Events across the platform. This feature would involve a dedicated search interface (potentially integrated into the command palette or a global search bar) that allows users to query and filter these entities.

**Requirements:**
*   **Unified Search Endpoint:** A single API endpoint capable of searching across MITs, Goals, and Events, or separate endpoints aggregated by a client-side service.
*   **Search Criteria:** Support for searching by:
    *   Keywords (e.g., title, description)
    *   Status (e.g., "completed," "in progress")
    *   Date ranges (for Goals and Events)
    *   Associated users/teams
*   **Result Display:** Search results should clearly indicate the entity type, relevant metadata (e.g., title, status, due date), and provide a direct link to the entity's detail view.
*   **Performance:** Search operations must be performant, even with a large number of entities. Consider indexing strategies (e.g., Elasticsearch, database full-text search).
*   **Filtering & Sorting:** Allow users to refine search results using filters (e.g., by type, status) and sorting options.

**Considerations:**
*   Define the data schema for each entity to ensure comprehensive search indexing.
*   Evaluate existing search technologies within the platform or consider new ones if necessary.
*   Prioritize which search criteria are most critical for initial implementation.