Amendment 46: BuilderOS Control Plane Proof - G1079-100

This document outlines the proof-closing blueprint note for Amendment 46, focusing on the required wiring of `routes/lifeos-council-builder-routes.js` to integrate BuilderOS control plane signals.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of concrete route handlers within `routes/lifeos-council-builder-routes.js` for the BuilderOS control plane signals:
-   A `POST /build/start` endpoint to initiate a build process, calling an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used`.
-   A `POST /build/complete` endpoint to finalize a build, calling an internal `recordBuildComplete` function with a token and OIL receipt IDs.
-   Integration of a `canMarkBuildDone` health check for the `/build/complete` endpoint, returning a 409 Conflict status if the check fails (e.g., when BuilderOS health is RED).

### 2. Smallest Safe Build Slice to Close It

The minimal implementation slice involves:
-   Defining two new `POST` routes in `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
-   Implementing the request body parsing for `task_id`, `blueprint_id`, `model_used` for `/build/start`.
-   Implementing the request body parsing for `token` and `OIL receipt IDs` for `/build/complete`.
-   Calling placeholder or existing internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) from within these route handlers.
-   Adding conditional logic to return 409 for `/build/complete` based on the `canMarkBuildDone` result.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will contain the new route definitions and their handlers.
-   `services/builder-control-plane-service.js` (or similar existing service file): This is the assumed location for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If these do not exist, stubs will be created here.

### 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   Verify `POST /build/start` handler correctly extracts `task_id`, `blueprint_id`, `model_used` and calls `recordBuildStart`.
    -   Verify `POST /build/complete` handler correctly extracts `token`, `OIL receipt IDs` and calls `recordBuildComplete`.
    -   Verify `POST /build/complete` handler calls `canMarkBuildDone` and handles its return value.
-   **Integration Tests:**
    -   Send `POST` request to `/build/start` with valid payload; expect 200/202 status.
    -   Send `POST` request to `/build/complete` with valid payload when `canMarkBuildDone` is true; expect 200/202 status.
    -   Send `POST` request to `/build/complete` with valid payload when `canMarkBuildDone` is false (simulating RED health); expect 409 status.
-   **Runtime Monitoring:**
    -   Observe logs for successful invocation of `recordBuildStart` and `recordBuildComplete` with correct parameters.
    -   Monitor BuilderOS health status and verify that 409 responses from `/build/complete` correlate with RED health states.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` or `recordBuildComplete` are not invoked, or are invoked with incorrect or missing parameters.
-   If `POST /build/complete` does not return a 409 status when `canMarkBuildDone` indicates a failure condition (e.g., BuilderOS health is RED).
-   If `POST /build/complete` returns a 409 status when `canMarkBuildDone` indicates a success condition (e.g., BuilderOS health is GREEN).
-   If the new routes (`/build/start`, `/build/complete`) are inaccessible, return unexpected HTTP status codes, or exhibit incorrect behavior under load.