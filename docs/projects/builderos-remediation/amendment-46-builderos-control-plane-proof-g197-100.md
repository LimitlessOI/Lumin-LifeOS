Amendment 46: BuilderOS Control Plane Proof - G197-100
This document outlines the proof-closing steps for Amendment 46, focusing on the BuilderOS control plane's build lifecycle management within `routes/lifeos-council-builder-routes.js`.

1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of robust wiring for the BuilderOS build lifecycle within `routes/lifeos-council-builder-routes.js`. Specifically, the following are missing:
    *   A `POST` endpoint for `/build/start` that internally calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   A `POST` endpoint for `/build/complete` that internally calls `recordBuildComplete` with a token and OIL receipt IDs.
    *   Logic within the `/build/complete` endpoint to check `canMarkBuildDone` and return a `409 Conflict` status if this check fails when the system health is RED.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
    *   Adding two new `POST` route handlers to `routes/lifeos-council-builder-routes.js`.
    *   Implementing the request body parsing for `task_id`, `blueprint_id`, `model_used`, `token`, and `oil_receipt_ids`.
    *   Importing and calling the internal `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions from the assumed `services/build-lifecycle-service.js`.
    *   Adding conditional logic to handle the `canMarkBuildDone` failure scenario for the `/build/complete` route.

3. Exact Safe-Scope Files to Touch First
    *   `routes/lifeos-council-builder-routes.js` (for route definition and handler logic).
    *   `services/build-lifecycle-service.js` (assumed to contain `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions; these functions are assumed to exist and only need to be imported and called).

4. Verifier/Runtime Checks
    *   **API Endpoint Verification**:
        *   `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used`. Expect `200 OK` and corresponding log/DB entry for build start.
        *   `POST /build/complete` with valid `token` and `oil_receipt_ids`. Expect `200 OK` and corresponding log/DB entry for build completion.
        *   `POST /build/complete` when `canMarkBuildDone` (simulated or actual) returns `false` due to RED health. Expect `409 Conflict`.
    *   **Database State Verification**: Confirm that `recordBuildStart` and `recordBuildComplete` correctly update the build status and associated metadata in the underlying data store.
    *   **Logging Verification**: Check system logs for successful build start/complete events and any error conditions.

5. Stop Conditions if Runtime Truth Disagrees
    *   If `POST /build/start` or `POST /build/complete` endpoints return unexpected HTTP status codes (e.g., `500 Internal Server Error` instead of `200 OK` or `409 Conflict`).
    *   If the database records for build lifecycle events are incorrect, incomplete, or missing after successful API calls.
    *   If the `409 Conflict` response for `canMarkBuildDone` failure is not triggered when expected, or is triggered incorrectly.
    *   If critical logging messages for build lifecycle events are absent or malformed.
    *   If the implementation introduces regressions to existing BuilderOS control plane functionality.