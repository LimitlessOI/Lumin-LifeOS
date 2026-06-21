<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G31 100. -->

Amendment 46: BuilderOS Control Plane Proof - G31-100

Proof-Closing Blueprint Note

This document outlines the implementation plan to close the proof gap identified in Amendment 46, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js` for BuilderOS control plane operations.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build process. Specifically, the following functionalities are missing:
-   A `POST` endpoint for `/build/start` to internally record the initiation of a build, requiring `task_id`, `blueprint_id`, and `model_used`.
-   A `POST` endpoint for `/build/complete` to internally record the completion of a build, requiring a build token and OIL receipt IDs.
-   Logic within the `/build/complete` endpoint to check `canMarkBuildDone` (likely a health-related check) and return a `409 Conflict` status if this check fails when the system health is RED.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
-   Adding two new `POST` route definitions to `routes/lifeos-council-builder-routes.js`.
-   Implementing the corresponding handler functions for these routes.
-   Integrating calls to existing or new internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) within these handlers.
-   Ensuring proper request body parsing and validation for incoming payloads.
-   Implementing the conditional `409` response logic.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their direct handler logic.
-   `services/builder-control-plane-service.js` (or similar existing service file): This file is the likely candidate for implementing or extending `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` if they don't already exist or need modification. For the initial wiring, the focus is on *calling* these functions from the routes.

### 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   Verify `recordBuildStart` is called with correct parameters on `/build/start`.
    -   Verify `recordBuildComplete` is called with correct parameters on `/build/complete`.
    -   Verify `canMarkBuildDone` is called on `/build/complete`.
    -   Verify 409 response when `canMarkBuildDone` returns false (health RED scenario).
-   **Integration Tests:**
    -   Send `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, `model_used` and assert 200 OK.
    -   Send `POST` request to `/build/complete` with valid token and OIL receipt IDs and assert 200 OK.
    -   Simulate a RED health state where `canMarkBuildDone` would fail, send `POST` request to `/build/complete`, and assert 409 Conflict.
-   **Manual Verification:**
    -   Use `curl` to hit `/build/start` and `/build/complete` endpoints.
    -   Monitor application logs to confirm internal service calls are made and data is processed.
    -   Verify database entries (if applicable) for build start/completion records.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` or `POST /build/complete` endpoints return unexpected HTTP status codes (e.g., 500, 400) for valid inputs.
-   If the internal `recordBuildStart` or `recordBuildComplete` functions are not invoked or fail to correctly persist build state.
-   If the `409 Conflict` response is not triggered when `canMarkBuildDone` indicates a failure condition (e.g., health RED).
-   If any existing routes or functionalities within `routes/lifeos-council-builder-routes.js` or related BuilderOS components are negatively impacted or cease to function as expected.