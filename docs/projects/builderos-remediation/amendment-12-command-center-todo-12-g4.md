<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Todo 12 G4. -->

BuilderOS Remediation: Amendment 12 Command Center - Projects Panel Data Integration

This memo addresses the "Projects panel renders with real data on page load" task from `AMENDMENT_12_COMMAND_CENTER.md`, currently blocking direct build. The goal is to enable the Projects panel in the Command Center to display actual project data upon page load, adhering to existing architectural patterns.

1.  **Blocking Ambiguity / Founder Decision List:**
    *   **Data Source:** What is the canonical API endpoint for fetching project data? (e.g., `/api/projects`, `/command-center/projects`).
    *   **Data Structure:** What is the expected JSON schema for a project object?
    *   **Error Handling:** How should API errors (e.g., 404, 500) or empty data sets be displayed in the UI?
    *   **Loading State:** What is the desired loading indicator for the panel while data is being fetched?

2.  **Already-Settled Constraints:**
    *   Target: `docs/projects/builderos-remediation/amendment-12-command-center-todo-12-g4.md`.
    *   Blueprint: `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`.
    *   Task: "Projects panel renders with real data on page load."
    *   No modification to LifeOS user features or TSOS customer-facing surfaces.
    *   Adhere to existing Node/ESM patterns and extend, do not rebuild.

3.  **Smallest Buildable Next Slice:**
    *   Locate the `ProjectsPanel` component (assumed path: `src/command-center/components/ProjectsPanel.jsx`).
    *   Implement a basic client-side data fetch (e.g., using `fetch` within a `useEffect` hook) to an assumed `/api/projects` endpoint.
    *   Store fetched data in component local state.
    *   Render a minimal list of project names or IDs from the fetched data.
    *   Include a basic loading state and error display.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First:**
    *   `src/command-center/components/ProjectsPanel.jsx` (or `.tsx`) - Primary component for data fetching and rendering.
    *   `src/command-center/api/projects.js` (or `.ts`) - If a new API route is required, or an existing one needs minor adjustments for data shape. (Requires founder decision on data source).

5.  **Required Verifier/Runtime Checks:**
    *   **Unit Tests:** Verify `ProjectsPanel` renders correctly with mock project data, loading states, and error states.
    *   **Integration Tests:** Confirm `ProjectsPanel` successfully fetches data from `/api/projects` and updates its display.
    *   **E2E Tests:** Load Command Center page; assert Projects panel displays non-empty, structured project data.
    *   **Runtime:** Visually confirm Projects panel populates with data on page load in a browser.

6.  **Stop Conditions:**
    *   The `ProjectsPanel` component successfully fetches and displays real project data on page load.
    *   No regressions in other Command Center functionalities.
    *   All relevant unit, integration, and E2E tests pass.
    *   Adherence to existing architectural patterns for data fetching and UI components.