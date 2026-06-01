### Proof-Closing Blueprint Note: BuilderOS Control Plane - G54-100 Remediation

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` file lacks the necessary POST endpoints to manage BuilderOS build lifecycle events. Specifically, it requires:
-   A `POST /build/start` endpoint to internally record the initiation of a build, accepting `task_id`, `blueprint_id`, and `model_used` in the request body.
-   A `POST /build/complete` endpoint to internally record the completion of a build, accepting a `token` and `oil_receipt_ids` in the request body. This endpoint must first invoke an internal `canMarkBuildDone()` check. If `canMarkBuildDone()` returns `false` (indicating a health RED state or other blocking condition), the endpoint must respond with a `409 Conflict` status.

**2. Smallest Safe Build Slice to Close It:**
Introduce two new POST route handlers within `routes/lifeos-council-builder-routes.js`. These handlers will:
-   Parse the request body for required parameters.
-   Call corresponding service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) which are assumed to exist in a `builder-control-plane-service.js` module.
-   Implement basic input validation to ensure required parameters are present.
-   Return appropriate HTTP status codes: `202 Accepted` for successful operations, `400 Bad Request` for invalid input, and `409 Conflict` when `canMarkBuildDone()` fails.
-   Include minimal error handling for service call failures.

**3. Exact Safe-Scope Files to Touch First:**
-   `routes/lifeos-council-builder-routes.js` (add new route definitions and their respective asynchronous handlers)
-   `services/builder-control-plane-service.js` (ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly defined and exported, or create stub implementations if they are not yet present for initial integration testing).

**4. Verifier/Runtime Checks:**
-   **Unit Tests:**
    -