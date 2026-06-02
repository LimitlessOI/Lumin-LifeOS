# Amendment 46: BuilderOS Control Plane Proof - G1043-100

## Proof-Closing Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This document outlines the implementation plan and verification steps to close the proof gap for wiring the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js`.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of two new `POST` endpoints in `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle:
*   `/build/start`: To initiate the recording of a build start event.
*   `/build/complete`: To finalize the recording of a build completion event, including a critical health check.

These endpoints need to integrate with an internal BuilderOS control plane service (e.g., `builderControlPlaneService`) to call `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `router.post` definitions to `routes/lifeos-council-builder-routes.js`.
2.  Implementing request body validation for both endpoints.
3.  Importing and utilizing a `builderControlPlaneService` (or similar) to encapsulate the business logic calls.
4.  Implementing the conditional `409 Conflict` response for `/build/complete` based on the `canMarkBuildDone` service call.
5.  Ensuring appropriate success (200/202) and error (400, 500) responses.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This is the primary file for adding the new route definitions and their handlers.
*   `services/builder-control-plane-service.js` (or similar existing BuilderOS service): This file would be the logical place to define or extend `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` if they don't already exist as stubs. For this build slice, we assume these functions are available for import.
*   `utils/validation.js` (or similar): If custom validation schemas are needed beyond basic checks.

### 4. Verifier/Runtime Checks

*   **Endpoint `/build/start`:**
    *   **Positive Case:** `POST /build/start` with valid `{ task_id: 't123', blueprint_id: 'b456', model_used: 'gpt-4' }` returns `202 Accepted` or `200 OK`. Verify `recordBuildStart` was called with the correct payload.
    *   **Negative Case (Invalid Input):** `POST /build/start` with missing `task_id` or invalid `blueprint_id` returns `400 Bad Request`.
    *   **Negative Case (Service Failure):** `POST /build/start` where `recordBuildStart` throws an error returns `500 Internal Server Error`.

*   **Endpoint `/build/complete`:**
    *   **Positive Case (Health GREEN):** `POST /build/complete` with valid `{ token: 'abc', oil_receipt_ids: ['oil1', 'oil2'] }` when `canMarkBuildDone()` returns `true`. Returns `202 Accepted` or `200 OK`. Verify `recordBuildComplete` was called with the correct payload.
    *   **Negative Case (Health RED):** `POST /build/complete` with valid payload when `canMarkBuildDone()` returns `false`. Returns `409 Conflict`.
    *   **Negative Case (Invalid Input):** `POST /build/complete` with missing `token` or empty `oil_receipt_ids` returns `400 Bad Request`.
    *   **Negative Case