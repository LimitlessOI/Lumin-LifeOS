# Amendment 46: BuilderOS Control Plane Proof - G611-100

This document serves as a proof-closing blueprint note for the BuilderOS control plane, specifically addressing the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of API endpoints in `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. Specifically:
*   A `POST /build/start` endpoint to record the initiation of a build, requiring `task_id`, `blueprint_id`, and `model_used`. This endpoint must internally call `builderControlPlaneService.recordBuildStart`.
*   A `POST /build/complete` endpoint to record the completion of a build, requiring a `token` and `oil_receipt_ids`. This endpoint must internally call `builderControlPlaneService.recordBuildComplete`.
*   The `POST /build/complete` endpoint must include a health check using `builderControlPlaneService.canMarkBuildDone`. If this check fails (e.g., due to a RED health status), the endpoint must return a `409 Conflict` status.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `POST` route definitions to `routes/lifeos-council-builder-routes.js`.
2.  Implementing request handlers for these routes that parse incoming JSON bodies.
3.  Integrating calls to existing `builderControlPlaneService` functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).
4.  Adding conditional logic for the `409 Conflict` response based on `canMarkBuildDone`'s outcome.

## 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`

## 4. Verifier/Runtime Checks

To verify the implementation:

*   **Build Start Endpoint:**
    *   Send a `POST` request to `/build/start` with a JSON body: `{"task_id": "test-task-123", "blueprint_id": "bp-456", "model_used": "g611"}`.
    *   Expected outcome: HTTP `200 OK` response.
    *   Internal check: Verify that `builderControlPlaneService.recordBuildStart` was invoked with the correct parameters.
*   **Build Complete Endpoint (Success Path):**
    *   Ensure `builderControlPlaneService.canMarkBuildDone()` would return `true` (simulated or actual healthy state).
    *   Send a `POST` request to `/build/complete` with a JSON body: `{"token": "build-token-xyz", "oil_receipt_ids": ["oil-1", "oil-2"]}`.
    *   Expected outcome: HTTP `200 OK` response.
    *   Internal check: Verify that `builderControlPlaneService.recordBuildComplete` was invoked with the correct parameters.
*   **Build Complete Endpoint (Failure Path - Health RED):**
    *   Ensure `builderControlPlaneService.canMarkBuildDone()` would return `false` (simulated or actual RED health state).
    *   Send a `POST` request to `/build/complete` with a JSON body: `{"token": "build-token-xyz", "oil_receipt_ids": ["oil-1", "oil-2"]}`.
    *   Expected outcome: HTTP `409 Conflict` response.
    *   Internal check: Verify that `builderControlPlaneService.recordBuildComplete` was *not* invoked.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If `POST /build/start` does not return `200 OK` or fails to call `recordBuildStart`.
*   If `POST /build/complete` does not return `200 OK` when `can