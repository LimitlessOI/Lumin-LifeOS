<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G121 100. -->

Amendment 46: BuilderOS Control Plane Proof - G121-100
This document outlines the proof-closing blueprint note for wiring the BuilderOS control plane routes as specified in Amendment 46.

1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. Specifically, the `/build/start` and `/build/complete` POST endpoints are missing, along with their integration with internal build state recording and health checks.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
    a. Adding two new POST routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
    b. Implementing the handler for `/build/start` to parse `task_id`, `blueprint_id`, and `model_used` from the request body and call `recordBuildStart`.
    c. Implementing the handler for `/build/complete` to parse `token` and `oil_receipt_ids` from the request body.
    d. Before calling `recordBuildComplete` in the `/build/complete` handler, invoke `canMarkBuildDone`. If `canMarkBuildDone` returns false (indicating RED health), return a 409 Conflict status.
    e. If `canMarkBuildDone` passes, call `recordBuildComplete`.

3. Exact Safe-Scope Files to Touch First
- `routes/lifeos-council-builder-routes.js` (primary modification)
- `services/builderControlPlaneService.js` (assuming `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` are defined and exported from here or a similar internal utility service file).

4. Verifier/Runtime Checks
- **Route Availability:**
    - `curl -X POST -H "Content-Type: application/json" -d '{"task_id": "t123", "blueprint_id": "b456", "model_used": "g1"}' http://localhost:PORT/build/start` should return 200 OK.
    - `curl -X POST -H "Content-Type: application/json" -d '{"token": "abc", "oil_receipt_ids": ["r1", "r2"]}' http://localhost:PORT/build/complete` should return 200 OK under normal health.
- **Function Invocation:**
    - Monitor internal logs to confirm `recordBuildStart` and `recordBuildComplete` are called with correct parameters.
- **Health Check Integration:**
    - Simulate a RED health state (e.g., by mocking `canMarkBuildDone` to return false) and verify `POST /build/complete` returns 409 Conflict.
    - Restore normal health and verify `POST /build/complete` returns 200 OK.
- **Data Persistence:**
    - Verify build start/complete events are correctly recorded in the underlying data store.

5. Stop Conditions if Runtime Truth Disagrees
- If `POST /build/start` or `POST /build/complete` routes return 404 Not Found.
- If `recordBuildStart` or `recordBuildComplete` are not invoked or throw errors during execution.
- If `POST /build/complete` does not return 409 when `canMarkBuildDone` indicates a RED health state.
- If `POST /build/complete` returns 409 when `canMarkBuildDone` indicates a GREEN health state.
- If the build state in the BuilderOS control plane does not transition as expected after successful route calls.