BuilderOS Remediation: Amendment 12 Command Center - Pending Adam Panel (Task G5)
Blueprint Enhancement Memo

This memo addresses the "Pending Adam panel shows count badge and items sorted by priority" task from `AMENDMENT_12_COMMAND_CENTER.md`. The current blueprint is not directly buildable due to open tasks and ambiguities regarding implementation specifics. This document provides a builder-ready enhancement memo.

---

### 1. Blocking Ambiguity / Founder Decision List

*   **Definition of "Pending Adam" items:** What specific status, flag, or criteria defines an item as "Pending Adam"? (e.g., `status: 'pending'`, `assignedTo: 'adam'`, `type: 'adam-review'`).
*   **Data Source for Adam Items:** Which specific database table(s) or external service(s) hold the "Adam" items? (e.g., `builder_tasks` table, `adam_reviews` service).
*   **Priority Definition and Storage:** How is "priority" determined and stored for these items? Is it an integer, an enum, or derived? What are the specific values and their intended sort order? (e.g., `priority: 1` (High), `priority: 2` (Medium), `priority: 3` (Low)).
*   **Badge Placement:** Exact UI/UX specification for the count badge placement on the "Pending Adam" panel (e.g., header, tab, alongside title).
*   **"Adam" Context:** Clarify if "Adam" refers to a specific user, a system component, or a category of tasks. (Assuming it's a category of tasks for BuilderOS internal operations).

### 2. Already-Settled Constraints

*   **Scope:** BuilderOS-only governed loop execution. No modifications to LifeOS user features or TSOS customer-facing surfaces.
*   **Existing Panel:** The "Pending Adam" panel UI component is assumed to exist and be accessible for modification.
*   **Functionality:** The panel must display a count badge and a list of items sorted by priority.

### 3. Smallest Buildable Next Slice

The smallest buildable slice focuses on establishing the data flow and basic UI rendering for the count badge and a placeholder item list.

1.  **Backend API Endpoint:** Create a new BuilderOS internal API endpoint (e.g., `/api/builder-os/adam-tasks/pending`) that returns:
    *   `count`: Total number of pending Adam items.
    *   `items`: An array of pending Adam items, including a placeholder `priority` field (e.g., `priority: 0` for all, or randomly assigned for initial testing).
2.  **Frontend Data Fetching:** In the existing "Pending Adam" panel component, integrate a call to this new API endpoint.
3.  **Count Badge Display:** Render the `count` value from the API response as a badge on the panel. Use a temporary visual style if the final style is not yet defined.
4.  **Item List Display:** Render the `items` array in a basic list format within the panel. Apply a default sort based on the placeholder `priority` field.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/builder-os/routes/adamRoutes.js`: Add a new GET route for `/api/builder-os/adam-tasks/pending`.
*   `src/builder-os/controllers/adamController.js`: Implement the handler for the new route, including logic to query for pending Adam items and their count.
*   `src/builder-os/services/adamService.js`: (If applicable) Add a function to abstract database queries for Adam items.
*   `src/builder-os/components/AdamPanel.js` (or equivalent): Modify this existing component to:
    *   Import and use the new API client/service.
    *   Add state for `pendingAdamCount` and `pendingAdamItems`.
    *   Render the count badge.
    *   Render the list of items, applying a basic sort.
*   `src/builder-os/models/AdamTask.js` (If applicable): Define or extend the data model for Adam tasks to include a `priority` field.

### 5. Required Verifier/Runtime Checks

*   **Unit Tests:**
    *   `adamController.js`: Verify the controller correctly queries and formats data for pending items and count.
    *   `AdamPanel.js`: Verify the component renders the badge and item list correctly based on mock data.
*   **Integration Tests:**
    *   API endpoint `/api/builder-os/adam-tasks/pending` returns a `200 OK` with expected `count` and `items` structure.
    *   Frontend component successfully fetches and displays data from the live API.
*   **E2E Tests:**
    *   Navigate to the BuilderOS Command Center. Verify the "Pending Adam" panel displays a non-zero count badge (if data exists) and a list of items.
*   **Runtime Checks:**
    *   Ensure robust error handling for API failures (e.g., network issues, server errors).
    *   Implement loading indicators while data is being fetched.
    *   Display a clear message when no pending Adam items are found.

### 6. Stop Conditions

*   The "Pending Adam" panel successfully displays a dynamically updated count badge.
*   The "Pending Adam" panel successfully displays a list of items fetched from the backend.
*   The displayed items are sorted according to a defined (even if placeholder) priority logic.
*   All new code adheres to existing BuilderOS coding standards and patterns.
*   No regressions or side effects are observed in other BuilderOS functionalities.
*   No changes are introduced to LifeOS user features or TSOS customer-facing surfaces.