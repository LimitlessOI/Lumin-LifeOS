Amendment 46 BuilderOS Control Plane Proof (G90-100) - Proof Closing Note

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file lacks the necessary `POST` endpoints for `/build/start` and `/build/complete`. Specifically, the implementation needs to:
    *   Define a `POST /build/start` route that calls an internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
    *   Define a `POST /build/complete` route that calls an internal `recordBuildComplete` function with `token` and `OIL receipt IDs`.
    *   Integrate a health check using `canMarkBuildDone` within the `/build/complete` route, returning a `409 Conflict` status if the health is `RED`.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves adding the two specified `POST` routes to `routes/lifeos-council-builder-routes.js`. This will require importing or defining the controller functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) that handle the business logic. The focus is on the routing layer and its interaction with the assumed controller.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: Add the new `POST` route definitions.
    *   `controllers/builder-council-controller.js` (or similar existing controller): Implement/expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.

4.  **Verifier/Runtime Checks**
    *   **Unit/Integration Tests:**
        *   Verify `POST /build/start` with valid payload successfully invokes `builderCouncilController.recordBuildStart`.
        *   Verify `POST /build/complete` with valid payload successfully invokes `builderCouncilController.recordBuildComplete`.
        *   Verify `POST /build/complete` returns `200 OK` when `builderCouncilController.canMarkBuildDone` returns `true` (health `GREEN`).
        *   Verify `POST /build/complete` returns `409 Conflict` when `builderCouncilController.canMarkBuildDone` returns `false` (health `RED`).
    *   **Manual/E2E Checks:**
        *   Send a `POST` request to `/build/start` with sample `task_id`, `blueprint_id`, `model_used` and observe system logs for `recordBuildStart` invocation.
        *   Send a `POST` request to `/build/complete` with sample `token` and `OIL receipt IDs` and observe system logs for `recordBuildComplete` invocation.
        *   Manually set BuilderOS health to `RED` (if possible via dev tools/API) and attempt `POST /build/complete` to confirm `409` response.
        *   Monitor BuilderOS internal state and metrics to confirm build start/completion events are correctly recorded.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `POST /build/start` or `POST /build/complete` routes are not reachable (e.g., 404 Not Found).
    *   If the internal `recordBuildStart` or `recordBuildComplete` functions are not invoked, or if they throw unhandled exceptions.
    *   If the `409 Conflict` response for `canMarkBuildDone` failing (health `RED`) is not consistently observed.
    *   If BuilderOS build state transitions (start/complete) are not accurately reflected in the system's internal state or logs, indicating a failure in the underlying controller logic.
    *   If any existing BuilderOS functionality is negatively impacted or regressions are introduced.