Amendment 46: BuilderOS Control Plane Proof - G7-100

Proof-Closing Blueprint Note

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of the `/build` start and complete API endpoints in `routes/lifeos-council-builder-routes.js`, along with their associated internal logic for recording build states and enforcing completion conditions. Specifically:
-   A `POST /build/start` endpoint to trigger `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST /build/complete` endpoint to trigger `recordBuildComplete` with `token` and `OIL receipt IDs`.
-   Conditional logic within the `/build/complete` endpoint to return a `409 Conflict` if `canMarkBuildDone()` fails when the system health is `RED`.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
-   Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
-   Implementing the handler for `/build/start` to parse `task_id`, `blueprint_id`, and `model_used` from the request body and call an internal `builderService.recordBuildStart()`.
-   Implementing the handler for `/build/complete` to parse `token` and `oilReceiptIds` from the request body, call an internal `builderService.canMarkBuildDone()`, and if it returns `false` (indicating health `RED`), respond with `409 Conflict`. Otherwise, call `builderService.recordBuildComplete()`.
-   Ensuring `builderService` (or equivalent internal module) exposes `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.

3. Exact Safe-Scope Files to Touch First
-   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their handlers.
-   `services/builder-control-plane.js` (or existing equivalent): Implement/expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. This file is assumed to exist or be the appropriate place for new internal builder-related service logic.

4. Verifier/Runtime Checks
-   **Unit/Integration Tests:**
    -   Verify `POST /build/start` successfully calls `recordBuildStart` with correct parameters and returns `200 OK`.
    -   Verify `POST /build/complete` successfully calls `recordBuildComplete` with correct parameters and returns `200 OK` when `canMarkBuildDone` is `true`.
    -   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` is `false` (health `RED`).
    -   Test with missing or invalid `task_id`, `blueprint_id`, `model_used`, `token`, `oilReceiptIds` to ensure appropriate error handling (e.g., `400 Bad Request`).
-   **System Logs:** Monitor logs for successful invocation of `recordBuildStart` and `recordBuildComplete` and any errors.
-   **Internal State:** Confirm that build records are correctly initiated and completed in the BuilderOS internal data store.

5. Stop Conditions if Runtime Truth Disagrees
-   If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., `404 Not Found`, `500 Internal Server Error` for valid requests).
-   If `recordBuildStart` or `recordBuildComplete` do not correctly update the internal build state or persist data as expected.
-   If the `409 Conflict` response for `canMarkBuildDone` failing is not consistently observed when health is `RED`, or if it's triggered incorrectly when health is `GREEN`.
-   If the introduction of these routes causes any regressions or performance degradation in existing BuilderOS or LifeOS functionalities.