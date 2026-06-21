<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G800 100. -->

Amendment 46: BuilderOS Control Plane Proof (G800-100)
Blueprint Note for C2 Build Pass

This note outlines the required implementation to wire the BuilderOS control plane within `routes/lifeos-council-builder-routes.js`, ensuring adherence to BuilderOS-only governed loop execution and no impact on LifeOS user features or TSOS customer-facing surfaces.

**1. Exact Missing Implementation or Proof Gap:**
The primary gap is the complete wiring of the `/build` endpoint within `routes/lifeos-council-builder-routes.js` to:
*   Handle `POST /build/start` requests, invoking `builderControlPlane.recordBuildStart({ task_id, blueprint_id, model_used })`.
*   Handle `POST /build/complete` requests, invoking `builderControlPlane.recordBuildComplete({ token, oilReceiptIds })`.
*   Implement a pre-completion check using `builderControlPlane.canMarkBuildDone()`. If this check fails (returns `false` or indicates RED health), the endpoint must return a `409 Conflict` status.

**2. Smallest Safe Build Slice to Close It:**
Implement the route handlers in `routes/lifeos-council-builder-routes.js` to:
*   Define a `POST /build/start` route. Extract `task_id`, `blueprint_id`, `model_used` from the request body. Call `builderControlPlane.recordBuildStart`.
*   Define a `POST /build/complete` route. Extract `token` and `oilReceiptIds` from the request body.
*   Before calling `builderControlPlane.recordBuildComplete`, invoke `builderControlPlane.canMarkBuildDone()`.
*   If `canMarkBuildDone()` indicates a "RED" state, respond with `res.status(409).send('Build completion not allowed: health RED');`.
*   Otherwise, proceed to call `builderControlPlane.recordBuildComplete` and respond with success (e.g., `200 OK` or `204 No Content`).

**3. Exact Safe-Scope Files to Touch First:**
*   `routes/lifeos-council-builder-routes.js`: Add/modify route definitions and their corresponding handler logic for `/build/start` and `/build/complete`.
*   `services/builder-control-plane.js`: Ensure the existence and correct implementation of `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. These functions are assumed to handle BuilderOS internal state updates and health checks.

**4. Verifier/Runtime Checks:**
*   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
    *   Verify `POST /build/start` calls `builderControlPlane.recordBuildStart` with correct payload.
    *   Verify `POST /build/complete` calls `builderControlPlane.recordBuildComplete` with correct payload when `canMarkBuildDone` is GREEN.
    *   Verify `POST /build/complete` returns `409 Conflict` when `builderControlPlane.canMarkBuildDone` is RED.
    *   Verify `POST /build/complete` returns `200 OK` (or `204 No Content`) when `builderControlPlane.canMarkBuildDone` is GREEN.
*   **Integration Tests:**
    *   Execute a full BuilderOS loop: trigger `/build/start`, then `/build/complete`. Assert BuilderOS state transitions correctly.
    *   Simulate a RED health state for `canMarkBuildDone` and attempt `/build/complete