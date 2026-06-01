# Amendment 12 Command Center Proof: G14-100 - Basic Task List (Read-Only)

This proof-closing blueprint note addresses the initial implementation of the "Basic Task List (read-only)" feature as outlined in Phase 1 of the Command Center blueprint.

---

**1. Exact Missing Implementation or Proof Gap:**

The Command Center frontend lacks a dedicated page to display a read-only list of BuilderOS tasks. This requires defining a GraphQL query for task data, implementing a React component to render this data, and integrating it into the existing Command Center navigation and routing.

**2. Smallest Safe Build Slice to Close It:**

Implement the "Tasks" page in the Command Center frontend to display a basic, read-only list of BuilderOS tasks. This slice focuses solely on data fetching and presentation, without any interactive modification capabilities.

**3. Exact Safe-Scope Files to Touch First:**

*   `apps/command-center/src/pages/tasks.tsx` (New file: React page component for displaying tasks)
*   `apps/command-center/src/components/TaskList.tsx` (New file: Reusable React component to render a list of tasks)
*   `apps/command-center/src/graphql/queries/tasks.graphql` (New file: GraphQL query definition for fetching tasks)
*   `apps/command-center/src/routes.ts` (Modification: Add a new route for `/tasks`)
*   `apps/command-center/src/components/Sidebar.tsx` (Modification: Add a navigation link to the `/tasks` page)

**4. Verifier/Runtime Checks:**

*   **Navigation Check:** Access the Command Center application and navigate to the newly added "Tasks" link in the sidebar or directly via the `/tasks` URL.
*   **Display Check:** Verify that a list of BuilderOS tasks is rendered on the page.
*   **Data Integrity Check:** Confirm that each task entry displays expected fields (e.g., `id`, `name`, `status`, `assignedTo`, `createdAt`) and that the data appears consistent with known BuilderOS task states.
*   **Read-Only Enforcement:** Ensure there are no interactive elements (buttons, input fields) that allow modification, deletion, or creation of tasks on this page.
*   **Network Request Check:** Using browser developer tools, confirm that a GraphQL query named `tasks` (or similar) is successfully executed and returns task data from the backend.

**5. Stop Conditions if Runtime Truth Disagrees:**

*   **Route Failure:** The `/tasks` URL results in a 404 error or a blank page without any rendered content.
*   **GraphQL Query Failure:** The GraphQL query for tasks fails (e.g., network error, server error, malformed response) or returns an empty array when tasks are expected to exist.
*   **Incorrect Data Display:** The displayed task data is incomplete, incorrect, or does not match the expected structure or values from the backend.
*   **Unexpected Interactivity:** The page presents any UI elements that allow modification, creation, or deletion of tasks, violating the "read-only" constraint.