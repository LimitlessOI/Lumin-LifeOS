# Amendment 46: BuilderOS Control Plane Proof - G865-100

This document serves as a proof-closing note for Amendment 46, focusing on the BuilderOS control plane enhancements. It addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` to manage build lifecycle events.

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module currently lacks the necessary POST endpoints and associated internal service calls to manage the BuilderOS build lifecycle. Specifically, there is no implementation for:
-   Recording the start of a build (`/build/start`).
-   Recording the completion of a build (`/build/complete`).
-   Enforcing a health-based pre-condition (`canMarkBuildDone`) for marking a build as complete, returning a 409 conflict status when health is RED.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST routes to the existing `lifeos-council-builder-routes` router. These routes will integrate with existing internal build management services (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) to handle build state transitions and enforce operational constraints.

### 3. Exact Safe-Scope Files to Touch First

1.  `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their respective handlers.
2.  `services/build-lifecycle-service.js` (or similar existing build management service): This module is assumed to expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If these functions reside in separate modules, those modules would also be in scope for import.

### 4. Verifier/Runtime Checks

To verify the implementation:

-   **Build Start:**
    -   Send a `POST` request to `/build/start` with a JSON body `{ task_id: '...', blueprint_id: '...', model_used: '...' }`.
    -   Expected outcome: HTTP 202 Accepted or 200 OK.
    -   Verify that `recordBuildStart` was called with the correct parameters and that the build start event is logged/persisted internally.
-   **Build Complete (Success Path):**
    -   Send a `POST` request to `/build/complete` with a JSON body `{ token: '...', oil_receipt_ids: ['...', '...'] }`.
    -   Ensure the system health is GREEN (or `canMarkBuildDone` returns true).
    -   Expected outcome: HTTP 202 Accepted or 200 OK.
    -   Verify that `recordBuildComplete` was called with the correct parameters and that the build completion event is logged/persisted internally.
-   **Build Complete (Health RED / Conflict Path):**
    -   Send a `POST` request to `/build/complete` with a JSON body `{ token: '...', oil_receipt_ids: ['...', '...'] }`.