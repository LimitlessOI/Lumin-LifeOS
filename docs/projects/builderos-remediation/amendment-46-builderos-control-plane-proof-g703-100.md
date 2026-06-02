Amendment 46 BuilderOS Control Plane Proof - G703-100

Proof-Closing Blueprint Note: BuilderOS Control Plane Wiring

This document addresses the implementation gap identified in Amendment 46 regarding the BuilderOS control plane wiring within `routes/lifeos-council-builder-routes.js`. It outlines the necessary steps to integrate build start and completion signals, and enforce health-based completion constraints.

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` currently lacks the necessary endpoint handlers and internal service calls to manage the BuilderOS build lifecycle. Specifically:
*   A `POST /build/start` endpoint to initiate a build, calling `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
*   A `POST /build/complete` endpoint to finalize a build, calling `recordBuildComplete` with a `token` and `OIL receipt IDs`.
*   Conditional logic within the `POST /build/complete` handler to check `canMarkBuildDone` (especially when system health is RED) and return a `409 Conflict` status if the check fails.

**2. Smallest Safe Build Slice to Close It:**
The required changes are confined to adding new route handlers and integrating existing BuilderOS service functions. This slice involves:
*   Defining two new `POST` routes: `/build/start` and `/build/complete`.
*   Importing `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` from the BuilderOS service layer (e.g., `../services/builder-service.js`).
*   Implementing the request body parsing and parameter extraction for each route.
*   Implementing the conditional `canMarkBuildDone` check and `409` response for build completion.

**3. Exact Safe-Scope Files to Touch First:**
*   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their logic.
*   `../services/builder-service.js` (assumed): This file is expected to contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. No modifications are expected here, only imports.

**4. Verifier/Runtime Checks:**
*   **Unit/Integration Tests:**
    *   Verify `POST /build/start` with valid payload calls `recordBuildStart` and returns 200/202.
    *   Verify `POST /build/complete` with valid payload calls `recordBuildComplete` and returns 200/202.
    *   Verify `POST /build/complete` when `canMarkBuildDone` returns `false` (simulating RED health) returns 409.
    *   Verify `POST /build/start` and `POST /build/complete` handle invalid payloads gracefully (e.g., 400 Bad Request).
*   **Runtime Monitoring:**
    *   Observe logs for successful `recordBuildStart` and `recordBuildComplete` calls.
    *   Monitor API response codes for `/build/start` and `/build/complete` endpoints.
    *   Verify `409` responses are correctly issued when `canMarkBuildDone` indicates a conflict.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If `recordBuildStart` or `recordBuildComplete` are not invoked or fail to persist build state as expected.
*   If the `/build/complete` endpoint does not return `409` when `canMarkBuildDone` indicates a conflict (e.g., health RED).
*   If the new routes introduce regressions or unexpected side effects in existing BuilderOS functionality.
*   If the system experiences increased error rates or performance degradation after deployment of these changes.