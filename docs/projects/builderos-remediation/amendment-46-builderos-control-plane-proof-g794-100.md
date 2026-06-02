Amendment 46: BuilderOS Control Plane Proof - G794-100
Proof-Closing Blueprint Note

This document addresses the signal requiring follow-through for Amendment 46, focusing on wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`.

**1. Exact Missing Implementation or Proof Gap**
The core gap is the absence of dedicated POST endpoints within `routes/lifeos-council-builder-routes.js` to handle the `recordBuildStart` and `recordBuildComplete` operations, along with the necessary health check integration for `canMarkBuildDone` to enforce a 409 conflict response when the system health is RED. Specifically, the `/build/start` and `/build/complete` routes are not yet implemented to call the required internal functions with the specified parameters.

**2. Smallest Safe Build Slice to Close It**
The smallest safe build slice involves:
*   Adding a `POST /build/start` route handler to `routes/lifeos-council-builder-routes.js` that extracts `task_id`, `blueprint_id`, and `model_used` from the request body and calls an internal `recordBuildStart` function.
*   Adding a `POST /build/complete` route handler to `routes/lifeos-council-builder-routes.js` that extracts `token` and `OIL receipt IDs` from the request body. This handler must first call an internal `canMarkBuildDone` function. If `canMarkBuildDone` returns false (indicating RED health), it must immediately respond with a 409 status. Otherwise, it proceeds to call an internal `recordBuildComplete` function.
*   Ensuring the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are accessible (imported) within `routes/lifeos-council-builder-routes.js`.

**3. Exact Safe-Scope Files to Touch First**
*   `routes/lifeos-council-builder-routes.js` (for route definition and handler logic)
*   Potentially, `services/builder-control-plane-service.js` (or similar existing service) if `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` need to be defined or exposed there. Assuming these functions exist and are importable.

**4. Verifier/Runtime Checks**
*   **Unit Tests:**
    *   Verify `POST /build/start` correctly calls `recordBuildStart` with `task_id`, `blueprint_id`, `model_used`.
    *   Verify `POST /build/complete` calls `canMarkBuildDone` before `recordBuildComplete`.
    *   Verify `POST /build/complete` returns 409 when `canMarkBuildDone` indicates RED health.
    *   Verify `POST /build/complete` calls `recordBuildComplete` with `token` and `OIL receipt IDs` when `canMarkBuildDone` indicates GREEN health.
*   **Integration Tests:**
    *   Send a `POST` request to `/build/start` and assert a 200/202 response and verify corresponding log entries or database state changes.
    *   Simulate a RED health state for `canMarkBuildDone` and send a `POST` request to `/build/complete`, asserting a 409 response.
    *   Simulate a GREEN health state for `canMarkBuildDone` and send a `POST` request to `/build/complete`, asserting a 200/202 response and verifying corresponding log entries or database state changes.
*   **Manual Verification:**
    *   Deploy the changes to a staging environment.
    *   Trigger a build start event via the new endpoint and observe system behavior and logs.
    *   Trigger a build complete event under both healthy and simulated unhealthy conditions and observe responses and system state.

**5. Stop Conditions if Runtime Truth Disagrees**
*   If `POST /build/start` or `POST /build/complete` routes are not reachable or return unexpected HTTP status codes (e.g., 404, 500) under normal conditions.
*   If `recordBuildStart` or `recordBuildComplete` are not invoked or fail to persist build state as expected.
*   If `POST /build/complete` does not return a 409 status when `canMarkBuildDone` explicitly signals a RED health state.
*   If the new routes introduce regressions or unintended side effects on existing BuilderOS or LifeOS functionalities.