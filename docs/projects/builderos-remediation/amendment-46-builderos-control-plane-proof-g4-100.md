Amendment 46: BuilderOS Control Plane Proof Gap G4-100 Remediation
This document outlines the proof-closing blueprint note for addressing the identified gap in the BuilderOS Control Plane, specifically regarding the wiring of build start and complete events within `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap**
    The core missing implementation is the addition of new POST routes within `routes/lifeos-council-builder-routes.js` to handle build lifecycle events. Specifically:
    *   A route to capture build start events, invoking an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used`.
    *   A route to capture build complete events, invoking an internal `recordBuildComplete` function with a `token` and `OIL receipt IDs`.
    *   The build complete route must also incorporate a health check, returning a `409 Conflict` status if `canMarkBuildDone` fails when the system's health is reported as RED.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves extending `routes/lifeos-council-builder-routes.js` to define the new POST endpoints and their respective handler logic. This includes importing and calling the necessary internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) and implementing the conditional 409 response. No changes to existing LifeOS user features or TSOS customer-facing surfaces are required.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: To add the new `/build/start` and `/build/complete` POST routes and their associated middleware/handlers.
    *   `services/builder-control-plane-service.js` (or similar internal service file): To ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly implemented and exposed for use by the routes.
    *   `utils/health-check.js` (or similar utility): To provide the underlying health status check that `canMarkBuildDone` would leverage.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:**
        *   Verify that a POST request to `/build/start` correctly invokes `recordBuildStart` with the expected `task_id`, `blueprint_id`, and `model_used`.
        *   Verify that a POST request to `/build/complete` correctly invokes `recordBuildComplete` with the expected `token` and `OIL receipt IDs`.
        *   Verify that a POST request to `/build/complete` returns a `409` status code when `canMarkBuildDone` returns `false` and the system health is RED.
        *   Verify that a POST request to `/build/complete` returns a `200` (or appropriate success code) when `canMarkBuildDone` returns `true` or health is not RED.
    *   **Integration Tests:**
        *   Execute end-to-end scenarios involving build start and complete events, monitoring logs and database entries to confirm event recording.
        *   Simulate RED health conditions and verify the `409` response for build completion attempts.
    *   **Manual Verification (Staging):**
        *   Deploy the changes to a staging environment.
        *   Manually trigger build start and complete events via API calls.
        *   Observe system behavior, logs, and data persistence for correctness.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` are not called, or are called with incorrect parameters, during build lifecycle events.
    *   If the `/build/complete` endpoint does not return a `409` status when `canMarkBuildDone` fails and health is RED.
    *   If the `/build/complete` endpoint returns a `409` status when `canMarkBuildDone` succeeds or health is not RED.
    *   If existing BuilderOS control plane functionality or any LifeOS user features are negatively impacted or exhibit regressions.
    *   If unexpected errors or performance degradation are observed in the `lifeos-council-builder-routes.js` module or related services.