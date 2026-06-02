# Amendment 46: BuilderOS Control Plane Proof - G25-100

## Proof-Closing Blueprint Note

This document outlines the implementation plan to close the proof gap identified in Amendment 46, specifically regarding the wiring of BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`. The goal is to enable robust build start and completion signaling, incorporating health checks for build finalization.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` to correctly handle build start and completion events, and to enforce health-based preconditions for marking a build as complete.

Specifically, the following functionalities are missing or not fully integrated:
-   **Build Start Endpoint**: A `POST /build/start` route that calls an internal `recordBuildStart` service with `task_id`, `blueprint_id`, and `model_used`.
-   **Build Complete Endpoint**: A `POST /build/complete` route that calls an internal `recordBuildComplete` service, passing a token and OIL receipt IDs.
-   **Health Check Integration**: The `POST /build/complete` endpoint must check `canMarkBuildDone` and return a `409 Conflict` if this check fails (e.g., when system health is RED).

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
-   Adding or modifying the `POST /build/start` route handler in `routes/lifeos-council-builder-routes.js` to invoke `recordBuildStart`.
-   Adding or modifying the `POST /build/complete` route handler in `routes/lifeos-council-builder-routes.js` to invoke `recordBuildComplete` and integrate the `canMarkBuildDone` check.
-   Ensuring the internal services (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are correctly implemented and exposed within the BuilderOS control plane.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This is the primary file for defining and integrating the new route handlers.
-   `services/builder-control-plane-service.js` (inferred): This file is the likely location for the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If this service does not exist, a new one adhering to existing patterns will be created within the BuilderOS scope.

### 4. Verifier/Runtime Checks

1.  **Unit/Integration Tests**:
    *   Verify `POST /build/start` successfully calls `recordBuildStart` with the expected `task_id`, `blueprint_id`, and `model_used` payload.
    *   Verify `POST /build/complete` successfully calls `recordBuildComplete` with the provided token and OIL receipt IDs when `canMarkBuildDone` returns `true`.
    *   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` returns `false` (e.g., simulating RED health).
    *   Verify `POST /build/complete` returns a `2xx` success code when `canMarkBuildDone` returns `true`.

2.  **Manual/E2E Checks**:
    *   Trigger a build start via the new `/build/start` endpoint and observe system logs or database for evidence of `recordBuildStart` invocation.
    *   Attempt to complete a build via `/build/complete` when the system health is known to be RED; confirm a `409` response.
    *   Attempt to complete a build via `/build/complete` when the system health is GREEN; confirm a successful `2xx` response and evidence of `recordBuildComplete` invocation.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` does not correctly invoke `recordBuildStart` or fails to process the payload, stop and debug the route handler and service integration.
-   If `POST /build/complete` does not correctly invoke `recordBuildComplete` or fails to pass the token/receipt IDs, stop and debug the route handler and service integration.
-   If `POST /build/complete` does not return `409` when `canMarkBuildDone` is `false`, or returns `409` when it should succeed, stop and debug the health check logic and conditional response.
-   If any of these endpoints introduce regressions to existing BuilderOS functionality or violate the "Do not modify LifeOS user features or TSOS customer-facing surfaces" constraint, stop and revert, then re-evaluate the implementation approach.

ASSUMPTIONS:
1. The "On `/build` start" and "On `/build` complete" refer to distinct `POST` endpoints, specifically `/build/start` and `/build/complete`, as this is a common and clear pattern for such actions.
2. Internal functions like `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` exist or will be created within a BuilderOS-specific service file (e.g., `services/builder-control-plane-service.js`), following existing patterns for service abstraction.