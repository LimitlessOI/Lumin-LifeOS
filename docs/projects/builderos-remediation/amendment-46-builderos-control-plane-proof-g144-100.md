Amendment 46 BuilderOS Control Plane Proof - G144-100
Proof-Closing Blueprint Note
This note details the implementation plan to close the gap identified in the signal for wiring `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file lacks the necessary endpoint implementations and internal service integrations to manage the BuilderOS build lifecycle as specified. Specifically:
    *   No `POST` endpoint for `/build/start` to trigger `recordBuildStart`.
    *   No `POST` endpoint for `/build/complete` to trigger `recordBuildComplete`.
    *   Missing conditional logic within the `/build/complete` flow to check `canMarkBuildDone` and return a 409 status code if the health is RED.
    *   The internal `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are not yet wired into the route handlers.

2.  **Smallest Safe Build Slice to Close It**
    Implement two new `POST` handlers within `routes/lifeos-council-builder-routes.js`:
    *   A `/build/start` endpoint that accepts `task_id`, `blueprint_id`, and `model_used` in its body, and calls `recordBuildStart` with these parameters.
    *   A `/build/complete` endpoint that accepts a `token` and `oil_receipt_ids` in its body. This handler will first call `canMarkBuildDone`. If `canMarkBuildDone` returns `false` (indicating RED health), it will immediately respond with a 409 status. Otherwise, it will proceed to call `recordBuildComplete` with the provided `token` and `oil_receipt_ids`.
    *   Ensure necessary imports for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are present.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js` (primary modification target)
    *   Potentially `services/builder-control-plane.js` or similar, if `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not yet defined or need modification to support the new call signatures. (Assuming these services exist and are importable).

4.  **Verifier/Runtime Checks**
    *   **Unit Test:** Create unit tests for `routes/lifeos-council-builder-routes.js` to mock `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` and verify:
        *   `POST /build/start` calls `recordBuildStart` with correct arguments.
        *   `POST /build/complete` calls `recordBuildComplete` with correct arguments when `canMarkBuildDone` is `true`.
        *   `POST /build/complete` returns 409 when `canMarkBuildDone` is `false`.
    *   **Integration Test:** Deploy to a staging environment and perform end-to-end tests:
        *   Send a `POST` request to `/build/start` and verify logs confirm `recordBuildStart` invocation and correct data persistence.
        *   Send a `POST` request to `/build/complete` with a valid token and OIL receipt IDs, ensuring `recordBuildComplete` is called and a 200/204 status is returned.
        *   Manually set BuilderOS health to RED (simulating `canMarkBuildDone` returning `false`), then send a `POST` request to `/build/complete` and verify a 409 status code is returned.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked or receive incorrect parameters during integration testing.
    *   If the `/build/complete` endpoint does not return a 409 status when `canMarkBuildDone` indicates a RED health state.
    *   If the `/build/complete` endpoint returns a 409 status when `canMarkBuildDone` indicates a GREEN health state.
    *   If any existing BuilderOS control plane functionality is inadvertently broken or altered.