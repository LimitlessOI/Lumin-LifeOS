Amendment 46: BuilderOS Control Plane Proof - G877-100
Proof-Closing Blueprint Note

This document addresses the implementation gap identified in Amendment 46 regarding the BuilderOS control plane, specifically the wiring of build start and complete signals within `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` file requires new or modified routes to:
    *   Handle `POST /build/start` to internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   Handle `POST /build/complete` to internally call `recordBuildComplete` with `token` and `OIL receipt IDs`.
    *   Implement a pre-check on `POST /build/complete` using `canMarkBuildDone`. If `canMarkBuildDone` fails (indicating health RED), the route must return a `409 Conflict` status.

2.  **Smallest Safe Build Slice to Close It:**
    The smallest safe build slice involves:
    *   Adding two new `POST` endpoints to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
    *   Implementing the logic within these endpoints to parse request bodies and call the respective internal service functions (`recordBuildStart`, `recordBuildComplete`).
    *   Integrating the `canMarkBuildDone` check before `recordBuildComplete` on the `/build/complete` endpoint.
    *   Ensuring proper error handling, specifically the `409` response for the health check failure.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js` (primary modification target)
    *   `services/builder-service.js` (or equivalent, to ensure `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` exist and are correctly implemented, if not already)

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests:**
        *   Verify `POST /build/start` with valid payload calls `recordBuildStart` once with correct arguments.
        *   Verify `POST /build/complete` with valid payload calls `recordBuildComplete` once with correct arguments when `canMarkBuildDone` is true.
        *   Verify `POST /build/complete` returns `409` when `canMarkBuildDone` is false, and `recordBuildComplete` is *not* called.
    *   **Integration Tests:**
        *   Send a `POST /build/start` request and verify the system state reflects a build initiation (e.g., database entry, log messages).
        *   Simulate a RED health state (e.g., mock `canMarkBuildDone` to return false) and send `POST /build/complete`, asserting a `409` response.
        *   Simulate a GREEN health state and send `POST /build/complete`, asserting a `200` (or `204`) response and system state reflecting build completion.
    *   **Runtime Monitoring:**
        *   Observe BuilderOS control plane logs for `buildStart` and `buildComplete` events.
        *   Monitor API response codes for `/build/complete` under various health conditions.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked as expected by the respective API calls.
    *   If incorrect or incomplete parameters are passed to `recordBuildStart` or `recordBuildComplete`.
    *   If the `409 Conflict` status is not returned from `POST /build/complete` when `canMarkBuildDone` indicates a RED health state.
    *   If the BuilderOS loop does not correctly transition states (e.g., from `BUILDING` to `COMPLETED`) based on these signals, indicating a deeper integration issue.
    *   If any unexpected side effects or regressions are observed in other BuilderOS or LifeOS functionalities.