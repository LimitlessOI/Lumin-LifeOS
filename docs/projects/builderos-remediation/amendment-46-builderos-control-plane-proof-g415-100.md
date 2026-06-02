Amendment 46: BuilderOS Control Plane Proof - G415-100
Proof-Closing Blueprint Note for `routes/lifeos-council-builder-routes.js` Wiring

This document outlines the necessary implementation to wire the BuilderOS control plane routes as specified in Amendment 46, focusing on the `/build` start and complete signals.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the specific route handlers and internal service calls required to manage BuilderOS build start and completion events. Specifically:
-   No `POST /build/start` endpoint to trigger `recordBuildStart`.
-   No `POST /build/complete` endpoint to trigger `recordBuildComplete`.
-   Missing integration of `canMarkBuildDone` health check for the `/build/complete` endpoint, which should return a 409 status if the health is RED.

### 2. Smallest Safe Build Slice to Close It

The minimal implementation slice involves extending `routes/lifeos-council-builder-routes.js` to:
-   Define a `POST` route at `/build/start` that accepts `task_id`, `blueprint_id`, and `model_used` in its body and calls an internal `recordBuildStart` function.
-   Define a `POST` route at `/build/complete` that accepts a `token` and `OIL receipt IDs` (assuming an array or comma-separated string) in its body and calls an internal `recordBuildComplete` function.
-   Before calling `recordBuildComplete`, invoke `canMarkBuildDone()`. If this function returns `false` (indicating RED health), the route handler must immediately respond with a 409 Conflict status.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new POST routes and their respective handlers.
-   `services/builder-control-plane-service.js` (or similar): This file is assumed to contain (or will be extended to contain) the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. These functions will be imported and utilized by the route handlers.

### 4. Verifier/Runtime Checks

-   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
    -   Verify `POST /build/start` calls `recordBuildStart` with `task_id`, `blueprint_id`, `model_used`.
    -   Verify `POST /build/complete` calls `canMarkBuildDone` before `recordBuildComplete`.
    -   Verify `POST /build/complete` returns 409 if `canMarkBuildDone` returns `false`.
    -   Verify `POST /build/complete` calls `recordBuildComplete` with `token` and `OIL receipt IDs` if `canMarkBuildDone` returns `true`.
-   **Integration Tests (`tests/integration/builder-control-plane.test.js`):**
    -   Send a `POST` request to `/build/start` and assert a 200/204 status and verify internal logging/database state changes.
    -   Send a `POST` request to `/build/complete` when `canMarkBuildDone` is mocked to return `false`, assert a 409 status.
    -   Send a `POST` request to `/build/complete` when `canMarkBuildDone` is mocked to return `true`, assert a 200/204 status and verify internal logging/database state changes.
-   **Manual Verification:**
    -   Use `curl -X POST -H "Content-Type: application/json" -d '{"task_id":"t123","blueprint_id":"b456","model_used":"g4"}' http://localhost:PORT/build/start` and observe response.
    -   Use `curl -X POST -H "Content-Type: application/json" -d '{"token":"abc","receipt_ids":["r1","r2"]}' http://localhost:PORT/build/complete` and observe response, testing both healthy and unhealthy `canMarkBuildDone` states (if controllable via env or mock).

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` does not correctly invoke `recordBuildStart` or passes incorrect parameters.
-   If `POST /build/complete` does not correctly invoke `canMarkBuildDone` or misinterprets its return value.
-   If `POST /build/complete` fails to return a 409 status when `canMarkBuildDone` indicates a RED health state.
-   If `POST /build/complete` does not correctly invoke `recordBuildComplete` or passes incorrect parameters when health is GREEN.
-   If the routes are not reachable or return unexpected HTTP status codes (e.g., 404, 500) under normal operating conditions.
-   If the BuilderOS control plane does not correctly register build start/complete events in its internal state or logs.