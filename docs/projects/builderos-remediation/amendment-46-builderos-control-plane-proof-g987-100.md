<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G987 100. -->

Amendment 46: BuilderOS Control Plane Proof - G987-100
Proof-Closing Blueprint Note
This note addresses the required wiring for `routes/lifeos-council-builder-routes.js` to integrate BuilderOS control plane signals.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file lacks the specific POST endpoints for `/build/start` and `/build/complete`. The underlying service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are also not yet integrated or fully defined within a BuilderOS control plane service.

2.  **Smallest Safe Build Slice to Close It**
    a.  Define and export `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` in `services/builder-control-plane.js`.
    b.  Add two new POST routes to `routes/lifeos-council-builder-routes.js`:
        *   `/build/start`: Calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
        *   `/build/complete`: Calls `recordBuildComplete` with `token` and `OIL receipt IDs`. Before calling `recordBuildComplete`, check `canMarkBuildDone()`. If `canMarkBuildDone()` returns false (indicating RED health), return HTTP 409 Conflict.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js` (add new POST routes and handlers)
    *   `services/builder-control-plane.js` (implement/extend `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`)
    *   `tests/routes/lifeos-council-builder-routes.test.js` (add unit/integration tests for new routes)
    *   `tests/services/builder-control-plane.test.js` (add unit tests for new service functions)

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** Verify `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` logic in `services/builder-control-plane.js`.
    *   **Integration Tests:**
        *   `POST /build/start` with valid payload returns 200 OK and records data.
        *   `POST /build/complete` with valid payload returns 200 OK and records data.
        *   `POST /build/complete` when `canMarkBuildDone` indicates RED health returns 409 Conflict.
    *   **Manual Verification (Local):**
        *   Execute `curl -X POST -H "Content-Type: application/json" -d '{"task_id":"t123","blueprint_id":"b456","model_used":"gpt-4"}' http://localhost:3000/build/start` and confirm success.
        *   Execute `curl -X POST -H "Content-Type: application/json" -d '{"token":"abc","oil_receipt_ids":["r1","r2"]}' http://localhost:3000/build/complete` and confirm success.
        *   Simulate RED health for `canMarkBuildDone` and re-run the `/build/complete` curl, expecting 409.
    *   **Logging:** Confirm audit logs for build start/complete events.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   Any 5xx HTTP response from the new `/build` endpoints.
    *   Failure to record build start/complete events in the underlying data store.
    *   Inconsistent or incorrect 409 Conflict response when `canMarkBuildDone` indicates RED health.
    *   Regression in existing BuilderOS control plane functionality.
    *   Unintended side effects on LifeOS user features or TSOS customer-facing surfaces.