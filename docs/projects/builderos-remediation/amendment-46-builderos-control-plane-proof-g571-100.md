Amendment 46: BuilderOS Control Plane Proof - G571-100

Proof-Closing Blueprint Note

This note details the missing implementation for wiring BuilderOS build lifecycle endpoints within `routes/lifeos-council-builder-routes.js` as required by Amendment 46.

1.  **Exact Missing Implementation / Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file lacks the necessary `POST` endpoints to manage the BuilderOS build lifecycle. Specifically:
    *   A `POST /build/start` endpoint is missing. This endpoint must accept `task_id`, `blueprint_id`, and `model_used` in its request body and call an internal `recordBuildStart` function with these parameters.
    *   A `POST /build/complete` endpoint is missing. This endpoint must accept a `token` and `oil_receipt_ids` in its request body and call an internal `recordBuildComplete` function with these parameters.
    *   The `/build/complete` endpoint must also incorporate a check using an internal `canMarkBuildDone` function. If `canMarkBuildDone` returns `false` when the system health is `RED`, the endpoint must respond with a `409 Conflict` status.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves adding the two specified `POST` routes and their corresponding handler logic within `routes/lifeos-council-builder-routes.js`. This includes importing or defining the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions, likely from a dedicated builder lifecycle service.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: Add new route definitions and their handler functions.
    *   `services/builder-lifecycle-service.js` (or similar existing builder service file): Implement or expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:**
        *   Verify `recordBuildStart` is called with `task_id`, `blueprint_id`, `model_used` on `/build/start` POST.
        *   Verify `recordBuildComplete` is called with `token`, `oil_receipt_ids` on `/build/complete` POST.
        *   Verify `canMarkBuildDone` is called on `/build/complete` POST.
    *   **Integration Tests:**
        *   `POST /build/start` with valid payload returns 200/202.
        *   `POST /build/complete` with valid payload returns 200/202.
        *   `POST /build/complete` when `canMarkBuildDone` fails (simulated RED health) returns 409.
    *   **Runtime Monitoring:** Observe logs for successful invocation of `recordBuildStart` and `recordBuildComplete` during BuilderOS loop execution. Monitor HTTP status codes for `/build/complete` under various system health conditions.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked, or are invoked with incorrect parameters, during a BuilderOS build cycle.
    *   If the `/build/complete` endpoint does not return a `409 Conflict` status when `canMarkBuildDone` indicates a failure condition under RED health.
    *   If the internal state tracking for build lifecycles (e.g., in a database or cache) does not accurately reflect the start and completion events.