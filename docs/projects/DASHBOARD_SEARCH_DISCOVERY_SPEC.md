# Cross-Surface Discovery & Search Specification

This document outlines the specification for enhancing discovery and navigation across LifeOS surfaces, focusing on seamless transitions, quick actions, and comprehensive search capabilities.

## 1. Dashboard to Lumin Contextual Handoff

**Objective:** Enable users to transition from the LifeOS Dashboard to Lumin with relevant context automatically applied, reducing friction and improving workflow continuity.

**Mechanism:**
When a user initiates a jump from the Dashboard to Lumin (e.g., by clicking a specific MIT, Goal, or Project card), the following context should be captured and passed:

*   **Entity Type:** (e.g., `MIT`, `Goal`, `Project`, `Event`)
*   **Entity ID:** The unique identifier of the selected entity.
*   **Current Dashboard View/Filter:** (e.g., "My Active MITs", "Upcoming Events")

**Lumin Behavior:**
Upon receiving the contextual data, Lumin should:

*   **Pre-filter/Pre-select:** Automatically apply filters or navigate to a view relevant to the passed entity.
    *   If an `MIT_ID` is passed, Lumin could open directly to the MIT's detail view or a filtered list showing related tasks.
    *   If a `Goal_ID` is passed, Lumin could display all MITs contributing to that goal.
*   **Highlight:** Visually highlight the specific entity if it's part of a larger list.
*   **Deep Linking:** The mechanism should leverage URL parameters or a client-side state management system to ensure the context is persistent and shareable.

**Example Flow:**
1.  User views "Project X" on the Dashboard.
2.  User clicks a "View in Lumin" button on the Project X card.
3.  Lumin loads, automatically filtered to show all MITs and Goals associated with "Project X".

## 2. Command Palette Feasibility

**Objective:** Explore the feasibility of a system-wide command palette to provide rapid access to actions, navigation, and search without requiring mouse interaction.

**Scope:** This section focuses on the *feasibility* and *design considerations*, deferring implementation.

**Proposed Functionality:**

*   **Quick Actions:**
    *   "Create New MIT"
    *   "Log Daily Progress"
    *   "Start Focus Session"
    *   "Review Pending Items"
*   **Navigation:**
    *   "Go to Dashboard"
    *   "Go to Lumin"
    *   "Open Settings"
    *   "View Profile"
*   **Search:**
    *   Integrated search for all searchable entities (see Section 3).

**Technical Considerations (Feasibility):**

*   **Client-Side Implementation:** A command palette would primarily be a client-side UI component, likely implemented using a framework like React or Vue.
*   **Data Sourcing:** Actions and navigation targets would be static or dynamically loaded from a client-side manifest. Search functionality would require API integration.
*   **Performance:** Must be highly responsive, with fuzzy matching and quick filtering of options.
*   **Accessibility:** Keyboard-first design is paramount.

**Interaction Model:**
*   Triggered by a global hotkey (e.g., `Cmd+K` or `Ctrl+K`).
*   Type to filter actions/entities.
*   `Enter` to execute/navigate.

## 3. Searchable Entities List

**Objective:** Define the core entities and their attributes that should be globally searchable across the LifeOS platform.

**Searchable Entities:**

*   **MITs (Most Important Tasks):**
    *   `title`
    *   `description`
    *   `status` (e.g., "active", "completed", "blocked")
    *   `tags`
    *   `associated_goal_title`
    *   `associated_project_title`
    *   `due_date` (range search)
*   **Goals:**
    *   `title`
    *   `description`
    *   `status` (e.g., "active", "achieved", "deferred")
    *   `tags`
    *   `associated_project_title`
*   **Events:**
    *   `title`
    *   `description`
    *   `location`
    *   `attendees`
    *   `start_time` / `end_time` (range search)
*   **Projects:**
    *   `title`
    *   `description`
    *   `status`
    *   `tags`
*   **People (Users/Collaborators):**
    *   `name`
    *   `email`
    *   `role`

**Search Interface:**

*   **Global Search Bar:** A prominent search bar accessible from all major application surfaces.
*   **Dedicated Search Page:** A more advanced search interface with filtering, sorting, and faceted search options.

**Technical Considerations:**

*   **Indexing:** A robust search index (e.g., Elasticsearch, PostgreSQL full-text search) will be required for efficient querying of large datasets.
*   **API Endpoint:** A dedicated `/api/v1/search` endpoint that accepts query parameters and returns a paginated list of results, potentially grouped by entity type.
*   **Relevance Ranking:** Implement a basic relevance ranking algorithm to prioritize results.
*   **Permissions:** Search results must respect user permissions and data access policies.