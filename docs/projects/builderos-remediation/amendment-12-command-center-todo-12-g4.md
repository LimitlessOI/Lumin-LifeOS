# Blueprint Enhancement Memo: Amendment 12 - Command Center Projects Panel Data

**Target:** `docs/projects/builderos-remediation/amendment-12-command-center-todo-12-g4.md`
**Source Blueprint:** `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`
**Relevant Section Summary:** Projects panel renders with real data on page load.

---

### 1. Blocking Ambiguity or Founder Decision List

*   **Data Source Definition:** What specific API endpoint(s) should provide the "real data" for projects? (e.g., `/api/v1/projects`, `/api/v1/users/{userId}/projects`).
*   **Data Structure:** What is the expected JSON schema for a "project" object returned by the API? (e.g., `id`, `name`, `status`, `description`).
*   **Authentication/Authorization:** Are there specific auth headers or tokens required for the project data API call?
*   **Error Handling Strategy:** How should UI respond to API errors (e.g., network issues, 4xx/5xx responses)? Display a generic error message, retry, or specific error states?
*   **Loading State UI:** What visual indicator should be displayed while project data is being fetched?

### 2. Already-Settled Constraints

*   The Projects panel must render with data on initial page load of the Command Center.
*   Data must be "real" (i.e., fetched from a backend service, not hardcoded or mocked).
*   Implementation must adhere to existing Node/ESM patterns and avoid rebuilding existing functionality.
*   Focus is on the Command Center's Projects panel, not other UI elements.

### 3. Smallest Buildable Next Slice

Implement the basic fetching and display of project names from a placeholder API endpoint.

*   **Backend (if needed):** Create a minimal `/api/projects` endpoint that returns a static array of `{ id: string, name: string }` objects. This can be a temporary mock endpoint within the existing API layer if a real one is not yet defined.
*   **Frontend:**
    *   Modify the Projects panel component to initiate a data fetch on mount.
    *   Store the fetched project data in its local state.
    *   Render a simple unordered list (`<ul>`) of project names.
    *   Include a basic "Loading..." message while data is being fetched.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/components/command-center/ProjectsPanel.js` (or `.jsx`/`.vue`/`.svelte` based on framework)
*   `src/services/projectService.js` (for encapsulating API calls)
*   `src/api/routes/projects.js` (if a new mock backend endpoint is required, assuming an existing API structure)
*   `src/types/project.d.ts` (if type definitions are used and a new project type is needed)

### 5. Required Verifier/Runtime Checks

*   **Initial Load:** Verify that upon navigating to the Command Center, a "Loading..." message appears briefly in the Projects panel.
*   **Data Display:** Verify that after loading, a list of project names (e.g., "Project Alpha", "Project Beta") is rendered in the Projects panel.
*   **Network Request:** Confirm via browser developer tools that a network request to `/api/projects` (or specified endpoint) is made and returns a 200 OK status.
*   **Error State (Basic):** If the API call fails (e.g., by temporarily disabling the mock endpoint), verify that the panel does not crash and ideally displays a fallback message (e.g., "Failed to load projects").

### 6. Stop Conditions

*   The Projects panel successfully fetches and displays a basic list of project names from the designated API endpoint on page load.
*   No console errors are present related to the data fetching or rendering of the Projects panel.
*   The implementation uses existing patterns for API interaction and component rendering.
*   The "Loading..." state is visible during data fetch.