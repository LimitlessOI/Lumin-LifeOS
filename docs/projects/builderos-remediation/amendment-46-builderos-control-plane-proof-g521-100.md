Amendment 46: BuilderOS Control Plane Proof - G521-100
This document serves as a proof-closing note for Amendment 46, focusing on the integration of build lifecycle tracking within the BuilderOS control plane via `routes/lifeos-council-builder-routes.js`.

1. Exact Missing Implementation or Proof Gap
The `routes/lifeos-council-builder-routes.js` file lacks the necessary endpoints and logic to track the BuilderOS build lifecycle. Specifically:
- A `POST /build/start` endpoint is missing to record the initiation of a build, requiring `task_id`, `blueprint_id`, and `model_used`.
- A `POST /build/complete` endpoint is missing to record the successful completion of a build, requiring a build token and OIL receipt IDs.
- The `POST /build/complete` endpoint does not include a pre-check using `canMarkBuildDone()` from the health service, which should return a `409 Conflict` status if the system health is RED.

2. Smallest Safe Build Slice to Close It
Implement the two new `POST` endpoints within `routes/lifeos-council-builder-routes.js`.
- **`POST /build/start`**:
    - Accepts `task_id`, `blueprint_id`, `model_used` in the request body.
    - Calls `buildLifecycleService.recordBuildStart({ task_id, blueprint_id, model_used })`.
    - Returns `200 OK` on success.
- **`POST /build/complete`**:
    - Accepts `build_token` and `oil_receipt_ids` in the request body.
    - First, call `healthService.canMarkBuildDone()`.
    - If `canMarkBuildDone()` returns `false` (indicating health RED), respond with `409 Conflict`.
    - If `canMarkBuildDone()` returns `true`, call `buildLifecycleService.recordBuildComplete({ build_token, oil_receipt_ids })`.
    - Returns `200 OK` on success.

3. Exact Safe-Scope Files to Touch First
- `routes/lifeos-council-builder-routes.js`: Add the new `POST` routes and their handlers.
- `services/build-lifecycle-service.js`: Ensure `recordBuildStart` and `recordBuildComplete` functions are implemented and correctly interact with the BuilderOS data store.
- `services/health-service.js`: Ensure `canMarkBuildDone` function is implemented to accurately reflect system health and return `true`/`false`.

4. Verifier/Runtime Checks
- **Unit/Integration Tests:**
    - Verify `POST /build/start` successfully calls `buildLifecycleService.recordBuildStart` with correct payload.
    - Verify `POST /build/complete` successfully calls `buildLifecycleService.recordBuildComplete` when `healthService.canMarkBuildDone` is `true`.
    - Verify `POST /build/complete` returns `409 Conflict` when `healthService.canMarkBuildDone` is `false`.
    - Verify database entries for build status are correctly updated after start and complete calls.
- **Runtime Monitoring:**
    - Monitor API gateway logs for successful `200 OK` responses on `/build/start` and `/build/complete`.
    - Monitor API gateway logs for `409 Conflict` responses on `/build/complete` during simulated health RED conditions.
    - Observe BuilderOS control plane dashboard for real-time build status updates.

5. Stop Conditions if Runtime Truth Disagrees
- If `recordBuildStart` or `recordBuildComplete` calls are not reflected in the BuilderOS data store or logs, indicating a service integration failure.
- If `POST /build/complete` returns `200 OK` when `healthService.canMarkBuildDone` should have prevented it (e.g., during a system outage), indicating a critical bypass of the health check.
- If `POST /build/complete` consistently returns `409 Conflict` even when system health is GREEN, indicating a misconfiguration or bug in `canMarkBuildDone`.
- If the BuilderOS control plane displays incorrect or stale build statuses, suggesting a data synchronization issue.

ASSUMPTIONS:
- `buildLifecycleService` and `healthService` modules exist and are accessible for import within `routes/lifeos-council-builder-routes.js`.
- The methods `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are or will be implemented within their respective service modules.