Amendment 46: BuilderOS Control Plane Proof - G743-100

Proof-Closing Blueprint Note

This note addresses the implementation gap for wiring the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as specified by Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The current `routes/lifeos-council-builder-routes.js` lacks the necessary POST endpoints for `/build/start` and `/build/complete` to manage the BuilderOS governed loop execution. Specifically:
    *   No endpoint to capture `recordBuildStart({ task_id, blueprint_id, model_used })` upon a build initiation.
    *   No endpoint to capture `recordBuildComplete` with `token` and `OIL receipt IDs` upon build completion.
    *   No health check integration to return a `409 Conflict` if `canMarkBuildDone()` fails when the system health is RED during a build completion attempt.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves adding two new POST route handlers to `routes/lifeos-council-builder-routes.js`. These handlers will:
    *   For `/build/start`: Extract `task_id`, `blueprint_id`, and `model_used` from the request body and call an internal `recordBuildStart` function.
    *   For `/build/complete`: Extract `token` and `oil_receipt_ids` from the request body. Before calling `recordBuildComplete`, it will check `canMarkBuildDone()`. If `canMarkBuildDone()` returns false (indicating health RED or other blocking condition), it will respond with a `409 Conflict`. Otherwise, it will proceed to call `recordBuildComplete`.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: Add the new POST route definitions and their handlers.
    *   `services/builder-control-service.js` (or similar internal service): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are defined and accessible for import. If they are stubs, their full implementation will follow in a subsequent pass.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** Add unit tests for the new route handlers in `routes/lifeos-council-builder-routes.test.js` to verify:
        *   Successful `POST /build/start` calls `recordBuildStart` with correct payload.
        *   Successful `POST /build/complete` calls `recordBuildComplete` with correct payload.
        *   `POST /build/complete` returns `409` when `canMarkBuildDone()` indicates a RED health state.
    *   **Integration Tests:** Use `curl` or a similar HTTP client to:
        *   `POST /lifeos-council/build/start` with a sample payload and verify a `200 OK` and expected internal logging/state change.
        *   `POST /lifeos-council/build/complete` with a sample payload and verify a `200 OK` and expected internal logging/state change.
        *   Simulate a RED health state (if possible via a test flag or mock) and `POST /lifeos-council/build/complete` to verify a `409 Conflict` response.
    *   **Log Monitoring:** Monitor application logs for successful calls to `recordBuildStart` and `recordBuildComplete`, and for `409` responses from `/build/complete`.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `POST /build/start` or `POST /build/complete` consistently return `500 Internal Server Error` or unexpected status codes (e.g., `404 Not Found` for the new routes).
    *   If `recordBuildStart` or `recordBuildComplete` are not being called as expected, indicated by missing logs or incorrect state changes in the BuilderOS control plane.
    *   If `POST /build/complete` does not return `409` when `canMarkBuildDone()` is known to be false (e.g., during a simulated RED health state), or conversely, returns `409` when health is GREEN.
    *   If the verifier rejects the `.md` file again with a syntax error, indicating a fundamental misunderstanding of the file type or content expectation.