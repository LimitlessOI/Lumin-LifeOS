Blueprint Note: Amendment 46 BuilderOS Control Plane Proof (G115-100)

This note addresses the implementation gap identified in Amendment 46 concerning the BuilderOS control plane, specifically the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap**
    The primary gap is the absence of wired endpoints in `routes/lifeos-council-builder-routes.js` to handle the BuilderOS build lifecycle events:
    *   Recording build start (`recordBuildStart`) with `task_id`, `blueprint_id`, and `model_used`.
    *   Recording build completion (`recordBuildComplete`) with `token` and `OIL receipt IDs`.
    *   Enforcing a pre-condition check (`canMarkBuildDone`) for build completion, returning a 409 conflict if the check fails when the system health is RED.

2.  **Smallest Safe Build Slice to Close It**
    Implement two new `POST` endpoints within `routes/lifeos-council-builder-routes.js`:
    *   `/build/start`: To trigger `recordBuildStart`.
    *   `/build/complete`: To trigger `recordBuildComplete` and incorporate the `canMarkBuildDone` health check.
    This approach minimizes changes by adding specific, isolated routes for the required lifecycle events, adhering to existing patterns.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: Add the new POST route handlers.
    *   `services/builder-control-plane-service.js` (or similar existing internal service): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly implemented and exposed for import.

4.  **Verifier/Runtime Checks**
    *   **Unit/Integration Tests:**
        *   Verify `POST /build/start` with valid payload successfully calls `recordBuildStart` and returns 200/202.
        *   Verify `POST /build/complete` with valid payload successfully calls `recordBuildComplete` and returns 200/202 when `canMarkBuildDone` passes.
        *   Verify `POST /build/complete` returns 409 when `canMarkBuildDone` fails (e.g., health is RED).
        *   Verify `POST /build/start` and `POST /build/complete` handle invalid payloads gracefully (e.g., 400 Bad Request).
    *   **Runtime Monitoring:**
        *   Observe BuilderOS control plane logs for successful `recordBuildStart` and `recordBuildComplete` invocations.
        *   Monitor system metrics to confirm build lifecycle events are being captured.
        *   Manually trigger a build completion when health is simulated RED to confirm 409 response.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` functions are not found, cannot be imported, or fail to execute as expected.
    *   If the `/build/start` or `/build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 500 Internal Server Error for valid requests).
    *   If the 409 Conflict status is not returned when `canMarkBuildDone` indicates a failure condition (health RED).
    *   If any existing BuilderOS control plane functionality or other routes in `lifeos-council-builder-routes.js` are negatively impacted or exhibit regressions.
    *   If the recorded build lifecycle events in the BuilderOS control plane do not accurately reflect the initiated and completed builds.