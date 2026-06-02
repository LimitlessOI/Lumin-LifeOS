The source blueprint `docs/projects/AMENDMENT_12_COMMAND_CENTER.md` was not provided, leading to assumptions about the specific implementation details.
# Amendment 12 Command Center Proof: G1035-100 Remediation

## Proof-Closing Blueprint Note

This note addresses the next smallest build slice required to advance the Amendment 12 Command Center implementation, specifically focusing on establishing a foundational data display.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the initial data synchronization and display for the `CommandCenterOverview` component. Specifically, the system lacks the implementation to fetch and render the real-time count of `activeBuilds` from the BuilderOS backend API. This is a critical first step for any operational command center to provide immediate status visibility.

### 2. Smallest Safe Build Slice to Close It

Implement the `activeBuilds` data fetching mechanism and integrate its display into the `CommandCenterOverview` component. This slice focuses solely on retrieving a single, high-priority metric and presenting it, minimizing scope and potential side effects.

### 3. Exact Safe-Scope Files to Touch First

*   `apps/builderos/src/api/builderosApi.js`: Add a new function, `fetchActiveBuilds()`, responsible for making the API call to `GET /api/builderos/active-builds`.
*   `apps/builderos/src/components/CommandCenterOverview.jsx`: Integrate the `fetchActiveBuilds()` function, manage its loading state, and display the `activeBuilds` count within a dedicated UI element.
*   `apps/builderos/src/api/builderosApi.test.js` (if exists, otherwise create): Add unit tests for `fetchActiveBuilds()`.
*   `apps/builderos/src/components/CommandCenterOverview.test.jsx` (if exists, otherwise create): Add integration/component tests to verify `activeBuilds` display.

### 4. Verifier/Runtime Checks

*   **UI Verification**: Navigate to the BuilderOS Command Center in a browser. Observe that a numerical value for "Active Builds" is displayed and updates if the backend data changes (e.g., by manually triggering a build).
*   **Network Inspection**: Open browser developer tools (Network tab). Confirm that a `GET` request to `/api/builderos/active-builds` is successfully made upon component mount, returning a JSON payload containing the `activeBuilds` count.
*   **Console Logs**: Check for any errors or warnings in the browser console related to data fetching or component rendering.
*   **Automated Tests**: Ensure all new and existing unit/integration tests pass for `builderosApi.js` and `CommandCenterOverview.jsx`.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **API Failure**: If the `GET /api/builderos/active-builds` endpoint consistently returns an error status (e.g., 4xx, 5xx) or malformed data, stop and investigate the backend API or network configuration.
*   **UI Inconsistency**: If the displayed `activeBuilds` count is consistently `0` when active builds are known to exist, or if it displays an incorrect value compared to the backend source of truth, stop and debug the data flow and rendering logic.
*   **Performance Regression**: If the Command Center page load time significantly increases or the UI becomes unresponsive after this change, stop and profile the component for rendering or data fetching bottlenecks.
*   **Test Failures**: Any new or existing automated test failures related to this build slice must be resolved before proceeding.