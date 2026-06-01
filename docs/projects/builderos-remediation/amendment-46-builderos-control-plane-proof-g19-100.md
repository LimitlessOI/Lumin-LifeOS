Proof-Closing Blueprint Note: G19-100 - BuilderOS Control Plane Wiring

This note addresses the wiring of BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

1.  **Exact Missing Implementation or Proof Gap:**
    The primary gap is the absence of the following route implementations in `routes/lifeos-council-builder-routes.js`:
    -   A `POST` endpoint for `/build` to initiate a build, calling an internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
    -   A `POST` endpoint for `/build/complete` (or similar, following existing patterns) to finalize a build, calling an internal `recordBuildComplete` function with a build token and OIL receipt IDs.
    -   Integration of a `canMarkBuildDone()` health check before `recordBuildComplete` to return a `409 Conflict` status if the health check indicates a RED state.

2.  **Smallest Safe Build Slice to Close It:**
    -   Add two new `router.post()` definitions within `routes/lifeos-council-builder-routes.js`.
    -   For the build start endpoint, parse `task_id`, `blueprint_id`, and `model_used` from the request body and pass them to `recordBuildStart`.
    -   For the build complete endpoint, parse the build token and OIL receipt IDs from the request body.
    -   Before calling `recordBuildComplete`, invoke `canMarkBuildDone()`. If it returns `false` (indicating RED health), immediately respond with `res.status(409).send('Build completion blocked: System health RED.')`.
    -   Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are imported from their respective service/utility modules, extending existing patterns.

3.  **Exact Safe-Scope Files to Touch First:**
    -   `routes/lifeos-council-builder-routes.js` (for route definitions and handler logic).
    -   (Assumption: `services/builder-control-service.js` or similar for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` if they are not yet defined or need modification to support the new call signatures/logic, adhering to "extend what is there".)

4.  **Verifier/Runtime Checks:**
    -   **Unit Tests:**
        -   Verify `routes/lifeos-council-builder-routes.js` handlers correctly parse request bodies and call `recordBuildStart` and `recordBuildComplete` with the expected arguments.
        -   Verify the `canMarkBuildDone` check correctly triggers a 409 response.
    -   **Integration Tests (using `supertest` or similar):**
        -   `POST /build` with valid `task_id`, `blueprint_id`, `model_used` returns `200 OK`.
        -   `POST /build/complete` with valid token and OIL receipt IDs returns `200 OK` when `canMarkBuildDone` is `true`.
        -   `POST /build/complete` with valid token and OIL receipt IDs returns `409 Conflict` when `canMarkBuildDone` is `false`.
    -   **Manual Verification:**
        -   Use `curl` or a similar tool to hit the new endpoints in a development environment and observe logs for `recordBuildStart` and `recordBuildComplete` invocations.
        -   Manually toggle the system health state (if possible) to verify the 409 response.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    -   Any unit or integration test fails to pass.
    -   `recordBuildStart` or `recordBuildComplete` are not invoked or receive incorrect parameters during integration testing.
    -   The `409 Conflict` response is not returned when `canMarkBuildDone` indicates a RED state, or is returned incorrectly when health is GREEN.
    -   Any unintended side effects are observed on existing BuilderOS control plane operations or LifeOS user features, violating the "Do not modify LifeOS user features" constraint.