# Amendment 46: BuilderOS Control Plane Proof - G563-100

## Proof-Closing Blueprint Note

This document outlines the necessary implementation to wire the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`, addressing the signal requiring follow-through for Amendment 46. The focus is on establishing robust build lifecycle management and health-aware completion.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to signal the start and completion of a BuilderOS build process. Specifically:
-   A `POST /build/start` endpoint to initiate build recording.
-   A `POST /build/complete` endpoint to finalize build recording, incorporating health checks and conditional completion.
-   The underlying service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and a health status check utility) are assumed to exist or will need to be stubbed/implemented in a dedicated BuilderOS control service layer.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `router.post` handlers to `routes/lifeos-council-builder-routes.js`.
2.  Implementing basic request body validation for `task_id`, `blueprint_id`, `model_used` on `/build/start` and `token`, `oil_receipt_ids` on `/build/complete`.
3.  Integrating calls to placeholder or existing internal service functions for `recordBuildStart` and `recordBuildComplete`.
4.  Within the `/build/complete` handler, adding a conditional check using `canMarkBuildDone` and a health status indicator. If `canMarkBuildDone` returns false when health is RED, return a 409 Conflict.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will receive the new route definitions and their handler logic.
-   `services/builderControlService.js` (or similar existing BuilderOS service): This file is the logical location for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If it doesn't exist, a new file should be created following existing service patterns.
-   `utils/systemHealth.js` (or similar existing health utility): This file would provide the `getSystemHealthStatus` function.

### 4. Verifier/Runtime Checks

1.  **API Endpoint Verification:**
    *   `POST /lifeos-council/builder/build/start` with valid `task_id`, `blueprint_id`, `model_used` returns 200/202.
    *   `POST /lifeos-council/builder