Amendment 46: BuilderOS Control Plane Proof G32-100

This document outlines the proof-closing blueprint note for integrating BuilderOS control plane signals into the `lifeos-council-builder-routes.js`. The focus is on wiring the necessary endpoints to manage build start and completion events, including a critical health check for build finalization.

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` file lacks the `POST /build` endpoint implementation. This endpoint must:
    *   On `status: 'start'`, call `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   On `status: 'complete'`, call `recordBuildComplete({ token, oil_receipt_ids })`.
    *   Before calling `recordBuildComplete`, check `canMarkBuildDone()`. If `canMarkBuildDone()` returns `false` (indicating health RED), return a `409 Conflict` status.

2.  **Smallest Safe Build Slice to Close It:**
    Implement the `POST /build` route handler within `routes/lifeos-council-builder-routes.js`. This handler will parse the request body for a `status` field (e.g., 'start' or 'complete') and dispatch to the appropriate internal service functions, including the `canMarkBuildDone` check.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js` (Add the new `POST /build` route and its handler logic).
    *   `services/builder-control-service.js` (Assuming `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are exposed from this service. If not, create or extend a suitable service layer).

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests:**
        *   Verify `POST /build` with `status: 'start'` correctly invokes `builderControlService.recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
        *   Verify `POST /build` with `status: 'complete'` correctly invokes `builderControlService.recordBuildComplete` with `token` and `oil_receipt_ids` when `canMarkBuildDone` is `true`.
        *   Verify `POST /build` with `status: 'complete'` returns `409 Conflict` when `builderControlService.canMarkBuildDone` is `false`.
    *   **Integration Tests:**
        *   Execute a full build lifecycle via `POST /build` (start then complete) and verify BuilderOS internal state transitions correctly.
        *   Simulate a RED health state and attempt to complete a build, verifying the `409` response.
    *   **Runtime Monitoring:**
        *   Monitor logs for successful `recordBuildStart` and `recordBuildComplete` calls.
        *   Monitor for `409` responses from `/build` endpoint under expected RED health conditions.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked or invoked with incorrect parameters.
    *   If the `409 Conflict` response is not returned when `canMarkBuildDone` indicates a RED health state.
    *   If BuilderOS internal build state (e.g., `task_id` status) does not reflect the expected transitions after route invocation.
    *   If unexpected latency or resource consumption is observed on the `lifeos-council-builder-routes` service.