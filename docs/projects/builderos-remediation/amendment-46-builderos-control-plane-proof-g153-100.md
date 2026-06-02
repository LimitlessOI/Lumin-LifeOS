Proof-Closing Blueprint Note: G153-100 - BuilderOS Control Plane Wiring

1. Exact Missing Implementation or Proof Gap:
The `routes/lifeos-council-builder-routes.js` module requires new route definitions and associated handler logic to support the BuilderOS build lifecycle. Specifically, the following are missing:
-   A `POST /build/start` endpoint. This route must accept `task_id`, `blueprint_id`, and `model_used` in the request body and call an internal `recordBuildStart` function.
-   A `POST /build/complete` endpoint. This route must accept a `token` and `OIL receipt IDs` (e.g., `oil_receipt_ids`) in the request body and call an internal `recordBuildComplete` function.
-   The `POST /build/complete` handler must check system health via an internal `canMarkBuildDone` function. If `canMarkBuildDone` returns `false` (indicating a RED health state), the endpoint must return a `409 Conflict` status.

2. Smallest Safe Build Slice to Close It:
-   Add `POST /build/start` and `POST /build/complete` route handlers to `routes/lifeos-council-builder-routes.js`.
-   Implement or integrate `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions, likely within a new or existing `services/builder-control-plane-service.js` or similar utility.

3. Exact Safe-Scope Files to Touch First:
-   `routes/lifeos-council-builder-routes.js`: Add new route definitions and handler logic.
-   `services/builder-control-plane-service.js` (or similar): Implement/export `recordBuildStart({ task_id, blueprint_id, model_used })`, `recordBuildComplete({ token, oil_receipt_ids })`, and `canMarkBuildDone()`.

4. Verifier/Runtime Checks:
-   **`POST /build/start`:** Send request with valid `task_id`, `blueprint_id`, `model_used`. Verify 200/201 status and database record creation.
-   **`POST /build/complete` (Success):** Send request with valid `token`, `oil_receipt_ids` for an active build. Verify 200/201 status and database record update to 'completed'.
-   **`POST /build/complete` (Health RED):** Simulate `canMarkBuildDone()` returning `false`. Send request. Verify `409 Conflict` status.
-   **Input Validation:** Test both endpoints with missing/invalid parameters; expect 400 Bad Request.

5. Stop Conditions if Runtime Truth Disagrees:
-   `POST /build/start` fails to create a build record or returns unexpected errors.
-   `POST /build/complete` fails to update a build record or returns unexpected errors when health is GREEN.
-   `POST /build/complete` does not return `409 Conflict` when `canMarkBuildDone()` indicates RED health.
-   New routes introduce regressions or interfere with existing BuilderOS/LifeOS functionality.
-   Internal `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` functions fail to perform their intended operations (e.g., persistence, health checks).