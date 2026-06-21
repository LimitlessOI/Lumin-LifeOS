<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G295-100 -->

# Amendment 46: BuilderOS Control Plane Proof - G295-100

## Proof-Closing Blueprint Note

This document outlines the implementation plan to wire the `routes/lifeos-council-builder-routes.js` as per the BuilderOS instruction, focusing on the `/build` start and complete signals, and the `canMarkBuildDone` health check.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` currently lacks the necessary POST endpoints for `/build/start` and `/build/complete`. Furthermore, the integration of internal functions `recordBuildStart`, `recordBuildComplete`, and the conditional 409 response based on `canMarkBuildDone` when system health is RED, is not present.

### 2. Smallest Safe Build Slice to Close It

The implementation involves adding two new POST routes to `routes/lifeos-council-builder-routes.js`:

*   **`POST /build/start`**:
    *   Accepts a JSON body with `task_id`, `blueprint_id`, and `model_used`.
    *   Calls an internal `builderControlService.recordBuildStart` function with these parameters.
    *   Responds with a success status (e.g., 202 Accepted).

*   **`POST /build/complete`**:
    *   Accepts a JSON body with `token` and `oil_receipt_ids`.
    *   Before proceeding, it checks the system health and calls `builderControlService.canMarkBuildDone()`.
    *   If `builderControlService.canMarkBuildDone()` returns `false` AND the system health is `RED`, it returns a `409 Conflict` status.
    *   Otherwise, it calls an internal `builderControlService.recordBuildComplete` function with the provided `token` and `oil_receipt_ids`.
    *   Responds with a success status (e.g., 202 Accepted).

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their respective handlers.
*   `services/builderControlService.js` (or similar existing service file): This file is assumed to contain (or will be extended to contain) the `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and `getSystemHealth` functions. If these functions do not exist, they will be created here.

### 4. Verifier/Runtime Checks

*   **Unit Tests**:
    *   Verify `POST /build/start` correctly parses `task_id`, `blueprint_id`, `model_used` and calls `builderControlService.recordBuildStart` with them.
    *   Verify `POST /build/complete` correctly parses `token` and `oil_receipt_ids`.
    *   Verify `POST /build/complete` returns 409 when `canMarkBuildDone` is false and health is RED.
    *   Verify `POST /build/complete` calls `builderControlService.recordBuildComplete` when `canMarkBuildDone` is true or health is not RED.
    *   Verify `POST /build/complete` handles cases where `oil_receipt_ids` might