# BuilderOS Command Center V2 Blueprint Proof: G128-100 - Initial Internal Status Endpoint

This document serves as a proof-closing note for the initial build slice of the BuilderOS Command Center V2, addressing the implementation gap identified in the `COMMAND_CENTER_V2_BLUEPRINT.md`. This slice focuses on establishing a foundational, internal-only API endpoint for basic BuilderOS status monitoring.

---

### 1. Exact missing implementation or proof gap

The primary gap is the absence of any functional API surface for Command Center V2 within BuilderOS. Specifically, a minimal, internal-facing endpoint is required to validate the routing, handler, and security patterns for subsequent, more complex Command Center features. The previous attempt to define this proof was rejected due to verifier misconfiguration attempting to execute the `.md` file as a Node.js module.

### 2. Smallest safe build slice to close it

Implement a new, internal-only BuilderOS API endpoint: `/builder-os/v2/status`. This endpoint will return a simple JSON object containing the current operational status and version of the BuilderOS Command Center V2 module. It will not interact with LifeOS user data or TSOS customer-facing surfaces.

### 3. Exact safe-scope files to touch first

-   `src/builder-os/v2/routes/status.js`: New file. Defines the `/builder-os/v2/status` route and its handler logic.
-   `src/builder-os/v2/index.js`: Existing file. Update to import and register the new `status.js` route.
-   `docs/builder-os/api/v2/status.md`: New file. Internal API documentation for the `/builder-os/v2/status` endpoint.
-   `tests/builder-os/v2/status.test.js`: New file. Unit tests for the `/builder-os/v2/status` endpoint.

### 4. Verifier/runtime checks

-   **Unit Test Pass:** Execute `npm test tests/builder-os/v2/status.test.js`. Expected outcome: All tests pass, asserting a `200 OK` response and the correct JSON payload (`{"status": "ok", "version": "2.0.0-alpha.1"}`).
-   **Internal Integration Test:** From within the BuilderOS network, perform a `curl` request to `http://localhost:PORT/builder-os/v2/status`. Expected outcome: A `200 OK` response with the JSON payload `{"status": "ok", "version": "2.0.0-alpha.1"}`.
-   **External Access Blocked:** Attempt to access `http://PUBLIC_IP:PORT/builder-os/v2/status` from outside the BuilderOS internal network. Expected outcome: Connection refused, 403 Forbidden, or similar access denial, confirming internal-only scope.
-   **Linter/Formatter Compliance:** Run `npm run lint` and `npm run format`. Expected outcome: No errors or warnings introduced by the new files.

### 5. Stop conditions if runtime truth disagrees

-   **Unit Test Failure:** If `tests/builder-os/v2/status.test.js` fails, stop and debug `src/builder-os/v2/routes/status.js` until all tests pass.
-   **Integration Test Failure (Internal):** If the internal `curl` request yields anything other than the expected `200 OK` and JSON payload, stop and debug `src/builder-os/v2/index.js` (route registration) or `src/builder-os/v2/routes/status.js` (handler logic).
-   **External Accessibility:** If the endpoint is accessible from outside the BuilderOS internal network, immediately revert the changes and investigate network ingress configurations and security group rules. This is a critical security failure.
-   **Data Leakage:** If the endpoint inadvertently exposes any LifeOS user data or TSOS customer-facing information, immediately revert and investigate data handling and scope.