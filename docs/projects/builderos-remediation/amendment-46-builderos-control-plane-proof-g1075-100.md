# Amendment 46: BuilderOS Control Plane Proof - G1075-100

## Proof-Closing Blueprint Note

This document addresses the signal requiring follow-through for Amendment 46, specifically the wiring of `routes/lifeos-council-builder-routes.js` to manage build start and completion events within the BuilderOS control plane.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated HTTP POST endpoints within `routes/lifeos-council-builder-routes.js` to handle the lifecycle events of a build: `start` and `complete`. Furthermore, the integration with internal BuilderOS service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) and the specified error handling for build completion (409 on `canMarkBuildDone` failure when health is RED) are not yet implemented.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST routes to the existing `lifeos-council-builder-routes` router. These routes will:
1.  `POST /build/start`: Accept `task_id`, `blueprint_id`, and `model_used` and call `recordBuildStart`.
2.  `POST /build/complete`: Accept `token` and `oil_receipt_ids`. Before calling `recordBuildComplete`, it will check `canMarkBuildDone`. If `canMarkBuildDone` returns false (indicating RED health or other blocking conditions), it will return a 409 Conflict status.

This slice focuses solely on the routing and immediate integration points, deferring deeper implementation details of `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` to their respective service layers, assuming their interfaces are stable.

### 3. Exact Safe-Scope Files to Touch First

The following file is the primary target for this build slice:

*   `routes/lifeos-council-builder-routes.js`

Assuming `builderService.js` (or similar) exists for the internal functions, its interface will be consumed but not modified in this slice.

### 4. Verifier/Runtime Checks

To verify the implementation:

*   **`POST /build/start`:**
    *   Send a `POST` request to `/build/start` with a JSON body: `{ "task_id": "test-task-123", "blueprint_id": "bp-456", "model_used": "gemini-flash" }`.
    *   Expected outcome: HTTP 202 Accepted or 200 OK.
    *   Verify internal logs confirm `recordBuildStart` was invoked with the correct parameters.
*   **`POST /build/complete` (Success Path):**
    *   Ensure