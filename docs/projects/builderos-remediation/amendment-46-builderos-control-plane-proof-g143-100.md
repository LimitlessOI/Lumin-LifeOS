<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G143 100. -->

Amendment 46: BuilderOS Control Plane Proof - G143-100

Proof-Closing Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This document outlines the missing implementation, the smallest safe build slice, affected files, verification steps, and stop conditions for wiring the BuilderOS control plane routes as specified in Amendment 46.

---

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of two critical API endpoints within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle:

*   **`POST /build/start`**: To initiate a build, requiring `task_id`, `blueprint_id`, and `model_used` in the request body. This endpoint must internally call `recordBuildStart()`.
*   **`POST /build/complete`**: To finalize a build, requiring a `token` and `OIL receipt IDs`. This endpoint must internally call `recordBuildComplete()`.
*   **Conditional `409 Conflict`**: The `/build/complete` endpoint must implement a check: if BuilderOS health is RED and `canMarkBuildDone()` returns `false`, a `409 Conflict` status must be returned, preventing `recordBuildComplete()` from being called.

The underlying service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and a health status check mechanism) are assumed to be available or will be implemented as part of this build slice.

### 2. Smallest Safe Build Slice to Close It

The minimal build slice involves:

1.  **Route Definition**: Add `POST /build/start` and `POST /build/complete` to `routes/lifeos-council-builder-routes.js`.
2.  **Handler Logic**:
    *   For `/build/start`: Extract `task_id`, `blueprint_id`, `model_used` from `req.body` and invoke `builderControlPlaneService.recordBuildStart()`.
    *   For `/build/complete`: Extract `token` and `oil_receipt_ids` from `req.body`. Implement conditional logic:
        *   Check BuilderOS health status.
        *   If health is RED, call `builderControlPlaneService.canMarkBuildDone()`.
        *   If `canMarkBuildDone()` returns `false`, respond with `res.status(409).send('Build cannot be marked complete due to system health.')`.
        *   Otherwise, invoke `builderControlPlaneService.recordBuildComplete()`.
3.  **Dependency Integration**: Ensure `builderControlPlaneService` (or equivalent module exposing `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and health status) is correctly imported and utilized within the route handlers.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js` (Primary file for route definitions and handler logic).
*   `services/builderControlPlaneService.