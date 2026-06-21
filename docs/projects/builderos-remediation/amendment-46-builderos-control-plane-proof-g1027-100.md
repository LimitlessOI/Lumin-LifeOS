<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G1027 100. -->

Amendment 46: BuilderOS Control Plane Proof - G1027-100
Proof-Closing Blueprint Note
This document addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` to support BuilderOS control plane operations.

1. Exact Missing Implementation or Proof Gap
The `routes/lifeos-council-builder-routes.js` file requires new `POST` endpoints to manage the BuilderOS build lifecycle. Specifically:
    -   A `POST /build/start` endpoint to initiate a build, calling an internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
    -   A `POST /build/complete` endpoint to finalize a build, calling an internal `recordBuildComplete({ token, oil_receipt_ids })` function.
    -   The `POST /build/complete` endpoint must incorporate a check using `canMarkBuildDone()` and return a `409 Conflict` status if this check fails when the system health is `RED`.
    -   The internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) need to be implemented or properly integrated from an existing BuilderOS control plane service.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
    -   Adding two new route definitions within `routes/lifeos-council-builder-routes.js` for `/build/start` and `/build/complete`.
    -   Implementing the corresponding handler functions for these routes.
    -   Ensuring proper input validation for `task_id`, `blueprint_id`, `model_used`, `token`, and `oil_receipt_ids`.
    -   Integrating calls to `recordBuildStart` and `recordBuildComplete` within their respective handlers.
    -   Implementing the `canMarkBuildDone` check and the 409 response logic within the `/build/complete` handler.

3. Exact Safe-Scope Files to Touch First
    -   `routes/lifeos-council-builder-routes.js`: For defining the new `POST /build/start` and `POST /build/complete` routes and their handlers.
    -   `services/builder-control-plane-service.js` (or similar existing internal service file): To implement or expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. (Assumption: these internal functions reside in a dedicated service file).
    -   `tests/unit/routes/lifeos-council-builder-routes.test.js`: For unit tests covering the new route handlers.
    -   `tests/integration/builder-control-plane.test.js`: For integration tests covering the full flow.

4. Verifier/Runtime Checks
    -   **Unit Tests:**
        -   Verify `POST /build/start` handler correctly parses input and calls `recordBuildStart`.
        -   Verify `POST /build/complete` handler correctly parses input and calls `recordBuildComplete`.
        -   Verify `POST /build/complete` handler returns 409 when `canMarkBuildDone` fails (e.g., mocks `canMarkBuildDone` to return false when health is RED).
    -   **Integration Tests:**
        -   Send `POST /build/start` with valid data; assert 200/202 status and verify `recordBuildStart` side effects (e.g., DB entry).
        -   Send `POST /build/complete` with valid data; assert 200/202 status and verify `recordBuildComplete` side effects.
        -   Configure system health to RED, then send `POST /build/complete`; assert 409 status.
        -   Configure system health to GREEN, then send `POST /build/complete`; assert 200/202 status.
    -   **Manual Verification:**
        -   Deploy the changes to a staging environment.
        -   Use `curl` or Postman to hit `/build/start` and `/build/complete` endpoints.
        -   Monitor logs for successful invocation of internal functions and correct data processing.
        -   Manually toggle system health to RED and verify the 409 response for `/build/complete`.

5. Stop Conditions if Runtime Truth Disagrees
    -   If `POST /build/start` or `POST /build/complete` routes return 404 (Not Found) or 500 (Internal Server Error) unexpectedly.
    -   If `recordBuildStart` or `recordBuildComplete` are not invoked, or if their internal logic fails (e.g., data not persisted, incorrect state updates).
    -   If the `canMarkBuildDone` check does not correctly trigger a 409 response when system health is RED, or if it incorrectly triggers a 409 when health is GREEN.
    -   If the data passed to `recordBuildStart` or `recordBuildComplete` (e.g., `task_id`, `blueprint_id`, `model_used`, `token`, `oil_receipt_ids`) is malformed or incomplete in the internal service calls.
    -   If existing BuilderOS or Life