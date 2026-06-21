<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G1103 100. -->

Amendment 46: BuilderOS Control Plane Proof - G1103-100
This document serves as a proof-closing blueprint note for Amendment 46, detailing the implementation plan to wire the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`.

1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of the `/build` start and complete POST endpoints within `routes/lifeos-council-builder-routes.js`. Specifically, the routes need to:
    - On `/build` start: Accept a POST request and internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
    - On `/build` complete: Accept a POST request and internally call `recordBuildComplete` with a build token and OIL receipt IDs.
    - Implement a pre-check for `/build` complete: If `canMarkBuildDone()` returns false (indicating RED health or other blocking conditions), return a 409 Conflict status.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves adding two new POST route handlers to `routes/lifeos-council-builder-routes.js`. These handlers will:
    - Parse necessary parameters from the request body.
    - Import and invoke the `recordBuildStart` and `recordBuildComplete` utility functions.
    - Import and invoke `canMarkBuildDone` before `recordBuildComplete` and handle the 409 conflict.
    - Return appropriate HTTP status codes (200 OK, 400 Bad Request for missing params, 409 Conflict).

3. Exact Safe-Scope Files to Touch First
- `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new POST routes.
- (Implicit) `utils/builder-control.js` (or similar): This file is assumed to contain `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. No direct modification is planned for this file in this slice, but its existence and correct functionality are prerequisites.

4. Verifier/Runtime Checks
- **Unit Tests:**
    - Verify `POST /build/start` correctly calls `recordBuildStart` with expected parameters.
    - Verify `POST /build/complete` correctly calls `recordBuildComplete` with expected parameters.
    - Verify `POST /build/complete` returns 409 when `canMarkBuildDone` returns false.
    - Verify `POST /build/complete` returns 200 when `canMarkBuildDone` returns true.
    - Verify error handling for missing required request body parameters (e.g., 400 Bad Request).
- **Integration Tests:**
    - Simulate a full build lifecycle: call `/build/start`, then `/build/complete`. Verify end-to-end data flow and state changes (e.g., in a mock database or log).
    - Test the 409 conflict scenario by mocking `canMarkBuildDone` to return false and attempting `/build/complete`.
- **Manual Verification:**
    - Use `curl` or a similar tool to send POST requests to `/build/start` and `/build/complete` with various payloads.
    - Observe server logs for `recordBuildStart` and `recordBuildComplete` invocations.
    - Manually trigger a RED health state (if possible in a dev environment) and attempt `/build/complete` to confirm 409.

5. Stop Conditions if Runtime Truth Disagrees
- If `recordBuildStart` or `recordBuildComplete` are not invoked or are invoked with incorrect parameters.
- If the `/build/complete` endpoint does not consistently return 409 when `canMarkBuildDone` indicates a blocking state (e.g., RED health).
- If the BuilderOS control loop exhibits instability or unexpected behavior after deployment.
- If any existing BuilderOS or LifeOS functionality is inadvertently impacted.
- If the routes return incorrect HTTP status codes for valid or invalid requests.