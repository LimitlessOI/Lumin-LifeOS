<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof - G641-100 -->

# Amendment 46 BuilderOS Control Plane Proof - G641-100

This document outlines the proof-closing blueprint note for the BuilderOS control plane wiring as specified in Amendment 46.

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated HTTP endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build process. Specifically:
-   A `POST` endpoint for `/build/start` to initiate build recording.
-   A `POST` endpoint for `/build/complete` to finalize build recording, incorporating health checks.

These endpoints need to integrate with existing or to-be-defined internal service functions: `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new routes to `routes/lifeos-council-builder-routes.js` and implementing their respective handlers. These handlers will:
-   For `/build/start`: Extract `task_id`, `blueprint_id`, and `model_used` from the request body and call `builderControlPlaneService.recordBuildStart()`.
-   For `/build/complete`: Extract `token` and `oil_receipt_ids`. Before calling `builderControlPlaneService.recordBuildComplete()`, it must invoke `builderControlPlaneService.canMarkBuildDone()`. If `canMarkBuildDone()` returns false (indicating a RED health state or other failure condition), the endpoint must return a 409 Conflict status. Otherwise, proceed to call `builderControlPlaneService.recordBuildComplete()`.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: To define the new `/build/start` and `/build/complete` POST routes.
-   `services/builder-control-plane-service.js` (or similar existing service): To ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are properly implemented and exposed. If these functions do not exist, they must be created here.

### 4. Verifier/Runtime Checks

-   **`POST /build/start`:**
    -   Send a `POST` request to `/build/start` with a JSON body containing `task_id`, `blueprint_id`, and `model_used`.
    -   Verify the response status is 200 OK or 202 Accepted.
    -   Verify through internal logging or database inspection that `recordBuildStart` was invoked with the correct parameters and the build start event was recorded.
-   **`POST /build/complete` (Health GREEN):**
    -   Ensure the system health state (as determined by `canMarkBuildDone`) is GREEN.
    -   Send a `POST` request to `/build/complete` with a JSON body containing `token` and `oil_receipt_ids`.
    -   Verify the response status is 200 OK or 202 Accepted.
    -   Verify through internal logging or database inspection that `recordBuildComplete` was invoked with the correct parameters and the build completion event was recorded.
-   **`POST /build/complete` (Health RED):**
    -   Artificially set or simulate a system health state where `canMarkBuildDone` returns false (e.g., health RED).
    -   Send a `POST` request to `/build/complete` with a JSON body containing `token` and `oil_receipt_ids`.
    -   Verify the response status is 409 Conflict.
    -   Verify through internal logging that `recordBuildComplete` was *not* invoked.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` fails to record a build start event or returns an unexpected status.
-   If `POST /build/complete` fails to record a build completion event when `canMarkBuildDone` is true.
-   If `POST /build/complete` does *not* return 409 when `canMarkBuildDone` is false (health RED).
-   If `canMarkBuildDone` is not invoked prior to `recordBuildComplete` on the completion path.
-   If the endpoints are accessible or respond to requests from non-BuilderOS authenticated entities, violating the "BuilderOS-only governed loop execution"