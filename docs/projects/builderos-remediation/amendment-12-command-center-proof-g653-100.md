<!-- SYNOPSIS: Amendment 12: Command Center Proof - G653-100 -->

# Amendment 12: Command Center Proof - G653-100

## Proof-Closing Blueprint Note

This note addresses the next smallest blueprint-backed build slice for Amendment 12, focusing on the initial display of BuilderOS job statuses within the Command Center UI.

1.  **Exact missing implementation or proof gap:**
    The foundational UI components for the Command Center page and the tabular display of BuilderOS job statuses are not yet implemented. Specifically, the `CommandCenterPage.jsx` needs to be created to serve as the main entry point, and `JobStatusTable.jsx` needs to be developed to render job status data fetched via the existing REST API endpoint (`/api/builder-os/job-status`). This slice focuses on static data display, deferring real-time updates via websockets to a subsequent slice.

2.  **Smallest safe build slice to close it:**
    Implement the `CommandCenterPage.jsx` to fetch a list of BuilderOS job statuses from the `/api/builder-os/job-status` endpoint and pass this data to a new `JobStatusTable.jsx` component for display. This establishes the basic page structure and data flow for status visualization.

3.  **Exact safe-scope files to touch first:**
    *   `src/ui/command-center/CommandCenterPage.jsx` (Create/implement the main page component, including data fetching logic)
    *   `src/ui/command-center/JobStatusTable.jsx` (Create/implement the table component to display job status data)
    *   `src/ui/routes.js` (Add a route for `/command-center` pointing to `CommandCenterPage.jsx`)

4.  **Verifier/runtime checks:**
    *   **UI Navigation:** Navigate to the `/command-center` URL in a web browser.
    *   **Page Render:** Verify that the `CommandCenterPage` loads without errors and displays a basic layout.
    *   **Data Fetch:** Observe network requests in the browser developer tools; confirm a successful GET request to `/api/builder-os/job-status` (HTTP