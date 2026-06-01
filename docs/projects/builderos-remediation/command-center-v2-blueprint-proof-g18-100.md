# Command Center V2 Blueprint Proof: G18-100 - BuilderOS Loop Status API Slice

This document outlines the next smallest build slice for the Command Center V2, focusing on establishing a foundational read-only API endpoint for BuilderOS loop status. This slice addresses the initial proof gap in exposing internal BuilderOS state for the Command Center.

---

## Proof-Closing Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The core API endpoint for retrieving a simplified, high-level status of active BuilderOS execution loops is not yet implemented. This gap prevents early validation of the BuilderOS internal API surface and basic data exposure for the Command Center V2.

**2. Smallest Safe Build Slice to Close It:**
Implement a new, read-only HTTP GET endpoint: `/builder-os/v1/loops/status`.
This endpoint will:
*   Return a 200 OK response.
*   Provide a JSON array of objects, where each object represents an active BuilderOS loop with at least an `id` (string) and a `status` (string, e.g., "running", "paused", "error", "completed").
*   Leverage existing internal BuilderOS loop management utilities to fetch this data without introducing new data persistence layers or complex business logic.
*   Be strictly read-only and not allow any state modification.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/builder-os/api/v1/loops/status.js` (New file: Endpoint handler logic for `/builder-os/v1/loops/status`)
*   `src/builder-os/api/v1/routes.js` (Modify: Register the new `/builder-os/v1/loops/status` route)
*   `src/builder-os/core/loop-manager.js` (Modify/Extend: Add or expose a method, e.g., `getSimplifiedLoopStatuses()`, to retrieve the necessary data from internal BuilderOS state)
*   `src/builder-os/api/index.js` (Modify: Ensure the `v1` routes are correctly exposed via the main BuilderOS API entry point)
*   `tests/builder-os/api/v1/loops/status.test.js` (New file: Unit and integration tests for the new endpoint)

**4. Verifier/Runtime Checks:**
*   **Unit Tests:**
    *   Verify `status.js` handler returns a 200 OK with an array of objects.
    *   Verify each object in the array contains `id` (string) and `status` (string) properties.
    *   Verify the `getSimplifiedLoopStatuses()` method in `loop-manager.js` returns expected data based on mocked internal state.
*   **Integration Tests:**
    *   Send a `GET` request to `/builder-os/v1/loops/status` via the BuilderOS API gateway.
    *   Assert a 200 OK response.
    *   Assert the response body is a JSON array matching the expected schema.
    *   Verify the endpoint is protected by BuilderOS internal authentication/authorization mechanisms.
*   **Runtime Check (Staging Environment):**
    *   Deploy the changes to a BuilderOS staging environment.
    *   Use `curl -X GET <BUILDEROS_API_BASE_URL>/builder-os/v1/loops/status` to manually verify the endpoint's accessibility and data output.
    *   Monitor BuilderOS logs for any unexpected errors or performance degradation.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If the endpoint returns any HTTP status code other than 200 OK (e.g., 4xx, 5xx).
*   If the returned JSON data does not conform to the expected `[{ id: string, status: string }]` schema.
*   If the endpoint exposes any sensitive internal BuilderOS data beyond the specified `id` and `status`.
*   If the implementation requires modifications to LifeOS user features or TSOS customer-facing surfaces.
*   If the endpoint introduces measurable performance degradation to BuilderOS loop execution or other critical internal services.
*   If the endpoint is accessible without proper BuilderOS internal authentication/authorization.