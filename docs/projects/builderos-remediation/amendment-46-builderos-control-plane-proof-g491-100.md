Amendment 46: BuilderOS Control Plane Proof - G491-100
This document outlines the proof-closing blueprint note for the BuilderOS control plane, specifically addressing the wiring of build start and complete signals within `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary route handlers and middleware to correctly process BuilderOS control plane signals. Specifically:
    *   There is no `POST` endpoint or middleware on `/build` to capture the start of a build and invoke an internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
    *   There is no `POST` endpoint or middleware on `/build` to capture the completion of a build and invoke an internal `recordBuildComplete` function, passing a build token and OIL receipt IDs.
    *   The build completion logic does not include a check using `canMarkBuildDone`. If `canMarkBuildDone` returns `false` while the system health is `RED`, the endpoint must return a `409 Conflict` status.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to:
    *   Introduce a new `POST /build` route or extend an existing one to handle both build start and complete signals.
    *   Within this route, implement logic to differentiate between a build start and a build complete event (e.g., based on payload structure or query parameters).
    *   For build start, extract `task_id`, `blueprint_id`, and `model_used` from the request body and call `recordBuildStart`.
    *   For build complete, extract the build token and OIL receipt IDs from the request body and call `recordBuildComplete`.
    *   Before calling `recordBuildComplete`, implement a conditional check: if `systemHealth.status === 'RED'` and `!canMarkBuildDone(token, oilReceiptIds)`, immediately respond with `res.status(409).send('Cannot mark build done: system health RED and condition not met.')`.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`
    *   (Assumption: `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and `systemHealth` are existing internal utilities or services that will be imported and used.)

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:**
        *   Verify `recordBuildStart` is called with correct parameters when a build start payload is received.
        *   Verify `recordBuildComplete` is called with correct parameters when a build complete payload is received and `canMarkBuildDone` passes or health is not RED.
        *   Verify a `409` response is returned when a build complete payload is received, `systemHealth.status` is `RED`, and `canMarkBuildDone` returns `false`.
        *   Verify a `200` (or appropriate success) response is returned when a build complete payload is received, `systemHealth.status` is `RED`, and `canMarkBuildDone` returns `true`.
    *   **Integration Tests:**
        *   Send `POST /build` requests with build start payloads and confirm `recordBuildStart` invocation in logs/mocks.
        *   Send `POST /build` requests with build complete payloads and confirm `recordBuildComplete` invocation in logs/mocks.
        *   Simulate `systemHealth.status = 'RED'` and `canMarkBuildDone` returning `false` for a build complete request, asserting a `409` response.
        *   Simulate `systemHealth.status = 'RED'` and `canMarkBuildDone` returning `true` for a build complete request, asserting a successful response.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked as expected for their respective signals.
    *   If the `409 Conflict` response is not returned when `canMarkBuildDone` fails under `RED` system health.
    *   If the parameters passed to `recordBuildStart` or `recordBuildComplete` are incorrect or missing.
    *   If the BuilderOS loop experiences unexpected failures or incorrect state transitions after these changes are deployed.