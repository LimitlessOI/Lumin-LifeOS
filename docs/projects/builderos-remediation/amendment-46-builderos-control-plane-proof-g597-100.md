<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G597 100. -->

Amendment 46: BuilderOS Control Plane Proof - G597-100

This document serves as a proof-closing note for `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, specifically addressing the signal to wire `routes/lifeos-council-builder-routes.js`.

### 1. Exact Missing Implementation or Proof Gap

The core missing implementation is the wiring of the `/build` endpoint within `routes/lifeos-council-builder-routes.js` to handle build start and completion events, including health-based conditional completion.

Specifically:
*   **`POST /build` (start):** Missing handler to invoke `recordBuildStart({ task_id, blueprint_id, model_used })`.
*   **`POST /build` (complete):** Missing handler to invoke `recordBuildComplete` with `token` and `OIL receipt IDs`.
*   **`POST /build` (complete - conditional):** Missing logic to check `canMarkBuildDone` (which depends on health status) and return a `409 Conflict` if it fails (i.e., health is RED).

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding `POST` route handlers for `/build` in `routes/lifeos-council-builder-routes.js`.
2.  Implementing the logic within these handlers to:
    *   Extract `task_id`, `blueprint_id`, `model_used` for build start.
    *   Extract `token` and `OIL receipt IDs` for build complete.
    *   Call the respective internal functions: `recordBuildStart` and `recordBuildComplete`.
    *   Before calling `recordBuildComplete`, invoke `canMarkBuildDone()`. If it returns `false`, immediately respond with `409 Conflict`.
3.  Ensuring `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are properly imported and accessible within the route file.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: Primary file for adding the new route handlers and their logic.
*   `services/builder-control-plane-service.js` (or similar): If `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` are not yet defined or exported, they would be added/modified here. (Assumption: these functions reside in a service layer).
*   `utils/health-check.js` (or similar): If `canMarkBuildDone` directly queries a health status, this utility might be involved.

### 4. Verifier/Runtime Checks

*   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
    *   Verify `POST /build` (start) successfully calls `recordBuildStart` with correct payload.
    *   Verify `POST /build` (complete) successfully calls `recordBuildComplete` with correct token and receipt IDs when `canMarkBuildDone` is true.
    *   Verify `POST /build` (complete) returns `409` when `canMarkBuildDone` is false (simulating RED health).
    *   Verify `POST /build` (start/complete) returns `400` for invalid/missing required parameters.
*   **Integration Tests (`e2e/builderos-flow.test.js`):**
    *   Simulate a full build lifecycle: `POST /build` (start) -> internal build process -> `POST /build` (complete). Assert internal state changes or database records.
    *   Test the `409` scenario by forcing a RED health state before `POST /build` (complete).
*   **Runtime Monitoring:**
    *   Observe API gateway logs for `200` responses on `/build` start/complete.
    *   Observe API gateway logs for `409` responses on `/build` complete under RED health.
    *   Monitor internal service logs for successful invocations of `recordBuildStart` and `recordBuildComplete`.
    *   Verify BuilderOS internal state transitions correctly after these events.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `POST /build` (start) completes successfully but `recordBuildStart` is not logged or internal state is not updated.
*   If `POST /build` (complete) completes successfully but `recordBuildComplete` is not logged or internal state is not updated.
*   If `POST /build` (complete) returns `200 OK` when `canMarkBuildDone` should have failed (e.g., health is RED).
*   If `POST /build` (complete) returns an error other than `409` when `canMarkBuildDone` fails.
*   If the BuilderOS control loop stalls or misbehaves after these endpoints are invoked, indicating a deeper integration issue.