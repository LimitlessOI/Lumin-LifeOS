<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G125 100. -->

Amendment 46: BuilderOS Control Plane Proof - G125-100 Remediation
This document outlines the implementation plan and proof-closing details for wiring the BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js` as per Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file lacks the necessary `POST` endpoints for `/build/start` and `/build/complete`. Specifically, the `/build/start` endpoint needs to call an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used`. The `/build/complete` endpoint needs to call `recordBuildComplete` with a token and OIL receipt IDs, and also implement a health check using `canMarkBuildDone` to return a 409 conflict if the health is RED.

2.  **Smallest Safe Build Slice to Close It**
    Implement two new `POST` routes within `routes/lifeos-council-builder-routes.js`:
    *   `POST /build/start`: Extract `task_id`, `blueprint_id`, `model_used` from the request body and pass them to `builderService.recordBuildStart()`.
    *   `POST /build/complete`: Extract `token` and `oilReceiptIds` from the request body. Before calling `builderService.recordBuildComplete()`, check `builderService.canMarkBuildDone()`. If it returns false (indicating health RED), respond with a 409 status. Otherwise, proceed to call `builderService.recordBuildComplete()`.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js` (for route definition and handler logic)
    *   `services/builderService.js` (assuming `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` are exposed here; if not, this file would need to be created or an existing service extended).

4.  **Verifier/Runtime Checks**
    *   **Unit/Integration Tests:**
        *   Verify `POST /build/start` with valid payload successfully calls `builderService.recordBuildStart` once with correct arguments.
        *   Verify `POST /build/complete` with valid payload successfully calls `builderService.recordBuildComplete` once with correct arguments when `canMarkBuildDone` is true.
        *   Verify `POST /build/complete` returns 409 status when `builderService.canMarkBuildDone` is false, and `builderService.recordBuildComplete` is *not* called.
        *   Verify `POST /build/start` and `POST /build/complete` handle missing/invalid payload parameters gracefully (e.g., 400 Bad Request).
    *   **Runtime Monitoring:**
        *   Observe logs for successful invocation of `recordBuildStart` and `recordBuildComplete` during actual BuilderOS loop executions.
        *   Monitor BuilderOS control plane metrics for build start/complete events and ensure they correlate with route invocations.
        *   Trigger a scenario where BuilderOS health is RED and attempt a `/build/complete` call; confirm a 409 response is received and no build completion is recorded.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked as expected when the respective routes are hit.
    *   If incorrect parameters are passed to `recordBuildStart` or `recordBuildComplete`.
    *   If the `/build/complete` endpoint does not return a 409 status when `canMarkBuildDone` indicates a RED health state.
    *   If the system proceeds to mark a build complete despite `canMarkBuildDone` returning false.
    *   If the BuilderOS loop experiences unexpected failures or state inconsistencies after these routes are enabled, indicating a deeper issue with the service interactions or health check logic.