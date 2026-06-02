# Amendment 46 BuilderOS Control Plane Proof - G53-100 Remediation

This document addresses the OIL verifier rejection and outlines the implementation plan to close the proof gap for Amendment 46, specifically regarding the BuilderOS control plane build lifecycle management.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the `/build` endpoints within `routes/lifeos-council-builder-routes.js` to correctly manage build start and completion events, including the necessary internal service calls and health-based pre-conditions. The internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are assumed to exist or will be implemented as part of the `builderControlPlaneService`.

Specifically, the following actions are missing:
-   A `POST` endpoint for `/build/start` that calls `builderControlPlaneService.recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST` endpoint for `/build/complete` that calls `builderControlPlaneService.recordBuildComplete({ token, oil_receipt_ids })`.
-   The `/build/complete` endpoint must check `builderControlPlaneService.canMarkBuildDone()` and return a `409 Conflict` if it fails (e.g., when health is RED).

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Defining the `POST /build/start` and `POST /build/complete` routes in `routes/lifeos-council-builder-routes.js`.
2.  Implementing the logic within these routes to parse incoming request bodies and invoke the respective `builderControlPlaneService` functions.
3.  Adding the conditional check for `canMarkBuildDone()` before allowing `recordBuildComplete` to proceed.
4.  Ensuring proper error handling and response codes (e.g., 409).

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their handlers.
-   `services/builder-control-plane-service.js` (or similar existing service): This file is where `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are expected to reside or be implemented if they are stubs. For this build slice, we assume these functions are either present or will be created as part of the service layer. The routes file will import and use them.

## 4. Verifier/Runtime Checks

To validate the implementation:

### Unit Tests
-   **`routes/lifeos-council-builder-routes.js`:**
    -   Verify that `POST /build/start` correctly parses `task_id`, `blueprint_id`, `model_used` from the request body and calls `builderControlPlaneService.recordBuildStart` with these parameters.
    -   Verify that `POST /build/complete` correctly parses `token` and `oil_receipt_ids` and calls `builderControlPlaneService.recordBuildComplete`.
    -   Verify that `POST /build/complete` returns `409 Conflict` when `builderControlPlaneService.canMarkBuildDone()` returns `false`.
    -   Verify that `POST /build/complete` returns `200 OK` (or appropriate success code) when `builderControlPlaneService.canMarkBuildDone()` returns `true` and `recordBuildComplete` succeeds.

### Integration Tests
-   Deploy the updated `routes/lifeos-council-builder-routes.js` to a staging environment.
-   Send a `POST` request to `/build/start` with valid payload and verify the internal system state reflects a build start.
-   Simulate a "RED" health state (e.g., by mocking `canMarkBuildDone` or manipulating the underlying health system) and send a `POST` request to `/build/complete`. Assert that a `409 Conflict` is received.
-   Restore "GREEN" health, send a `POST` request to `/build/complete` with valid payload, and verify the internal system state reflects a build completion and the OIL receipt IDs are recorded.

### OIL Verifier
-   The verifier should successfully parse and validate the updated `routes/lifeos-council-builder-routes.js` without syntax errors.
-   The verifier should confirm the presence and correct invocation of the specified internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) within the `/build` endpoints.

## 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be stopped and re-evaluated if any of the following conditions are met:
-   The `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 404, 500) under normal operating conditions.
-   The internal `builderControlPlaneService.recordBuildStart` or