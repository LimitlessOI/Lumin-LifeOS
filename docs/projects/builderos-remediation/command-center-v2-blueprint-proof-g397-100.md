# Command Center V2 Blueprint Proof - G397-100: System Status Indicator

This document serves as a proof-closing note for the initial build slice of Command Center V2, specifically addressing the foundational capability to display system status.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a functional, real-time system status indicator within the Command Center V2 dashboard. This indicator is crucial for operators to quickly ascertain the overall health of the system. The current state lacks any mechanism to fetch, display, or update this critical information.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing a basic `SystemStatusIndicator` component. This component will be responsible for:
*   Fetching system status from a dedicated (initially mock) API endpoint.
*   Displaying the status clearly (e.g., "Operational", "Degraded", "Offline").
*   Integrating this component into the main Command Center V2 dashboard page.

This slice focuses solely on read-only display of status, without introducing complex state management, real-time subscriptions, or actionable controls.

## 3. Exact Safe-Scope Files to Touch First

To implement this slice, the following files are within the approved builder safe scope and should be touched first:

*   `src/builder/components/SystemStatusIndicator.js`: New React component for displaying system status.
*   `src/builder/pages/CommandCenterV2Dashboard.js`: Existing or new page component where the `SystemStatusIndicator` will be integrated.
*   `src/builder/api/status.js`: New or extended API utility to fetch system status (initially a mock implementation).
*   `tests/builder/components/SystemStatusIndicator.test.js`: Unit tests for the new `SystemStatusIndicator` component.
*   `docs/projects/builderos-remediation/command-center-v2-blueprint-proof-g397-100.md`: This proof document itself.

## 4. Verifier/Runtime Checks

To confirm successful implementation and close this proof gap, the following checks will be performed:

*   **Unit Test Verification:**
    *   `npm test tests/builder/components/SystemStatusIndicator.test.js` passes, ensuring the component renders correctly with various mock status inputs.
*   **Integration Test Verification:**
    *   An integration test (e.g., using `@testing-library/react` within `tests/builder/pages/CommandCenterV2Dashboard.test.js` if it exists, or a new one) confirms that `SystemStatusIndicator` is rendered within the `CommandCenterV2Dashboard` and displays the fetched status.
*   **API Endpoint Verification:**
    *   A direct `GET /builder/api/status` request (e.g., via `curl` or browser dev tools) returns a valid JSON object representing the system status (e.g., `{ "status": "Operational" }`).
*   **Manual UI Verification (BuilderOS):**
    *   Navigate to the BuilderOS Command Center V2 dashboard URL (e.g., `/builder/command-center-v2`).
    *   Visually confirm the presence of a "System Status:" label followed by the current status (e.g., "Operational").
    *   Verify that the displayed status updates if the mock API is temporarily modified.

## 5. Stop Conditions if Runtime Truth Disagrees

If any of the verifier/runtime checks fail, the following stop conditions apply:

*   **Component Rendering Failure:** If `SystemStatusIndicator` does not render or throws errors, halt and debug the component's JSX, state management, and prop handling.
*   **API Fetch Failure:** If the component fails to fetch status or the API endpoint is unreachable/returns malformed data, halt and debug `src/builder/api/status.js` and network configuration.
*   **Incorrect Status Display:** If the displayed status does not match the expected value from the API, halt and debug data parsing, state updates, and rendering logic within `SystemStatusIndicator`.
*   **Integration Failure:** If `SystemStatusIndicator` is not visible on `CommandCenterV2Dashboard`, halt and debug component import/export paths, and the parent component's rendering logic.
*   **Security/Scope Violation:** If any changes are detected outside the specified safe-scope files or impact LifeOS user features/TSOS customer surfaces, immediately halt and revert all changes.

This build slice is designed to be self-contained and verifiable, providing a clear path for the next C2 build pass.