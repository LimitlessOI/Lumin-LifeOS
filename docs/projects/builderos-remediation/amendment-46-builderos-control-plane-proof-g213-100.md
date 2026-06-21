<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G213 100. -->

Amendment 46: BuilderOS Control Plane Proof - G213-100

This document serves as a proof-closing blueprint note for `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, specifically addressing the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` file lacks the necessary `POST` endpoints for `/build/start` and `/build/complete`. The internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not yet integrated into the route handlers, specifically the health check for `canMarkBuildDone` returning a 409 status.

2.  **Smallest Safe Build Slice to Close It:**
    Implement two new `POST` routes within `routes/lifeos-council-builder-routes.js`:
    *   `/build/start`: Accepts `task_id`, `blueprint_id`, and `model_used` in the request body, calls `builderControlService.recordBuildStart`.
    *   `/build/complete`: Accepts `token` and `oil_receipt_ids` in the request body. Before calling `builderControlService.canMarkBuildDone()`, it must check the health status. If `canMarkBuildDone` returns `false` (indicating RED health), return a 409 Conflict status. Otherwise, proceed to call `builderControlService.recordBuildComplete`.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their handler logic.
    *   `services/builder-control-service.js` (or equivalent): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are properly defined and exported, or create stubs if they are not yet implemented.

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests:**
        *   Verify `POST /build/start` calls `builderControlService.recordBuildStart` with correct parameters and returns 200.
        *   Verify `POST /build/complete` calls `builderControlService.recordBuildComplete` with correct parameters and returns 200 when `canMarkBuildDone` is true.
        *   Verify `POST /build/complete` returns 409 when `canMarkBuildDone` is false.
    *   **Integration Tests:**
        *   Send a `POST` request to `/build/start` and confirm the build start record is created/updated in the underlying data store.
        *   Send a `POST` request to `/build/complete` (with `canMarkBuildDone` true) and confirm the build completion record is created/updated.
        *   Simulate a RED health state (where `canMarkBuildDone` returns false) and send a `POST` request to `/build/complete`, asserting a 409 response.
    *   **Logging:** Confirm that successful build start/complete actions and 409 rejections are logged.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 404, 500).
    *   If `recordBuildStart` or `recordBuildComplete` do not correctly persist or update build state information.
    *   If the `/build/complete` endpoint does not consistently return a 409 status when `builderControlService.canMarkBuildDone()` evaluates to `false`.
    *   If the data (`task_id`, `blueprint_id`, `model_used`, `token`, `oil_receipt_ids`) is not correctly extracted from the request body or passed to the service functions.