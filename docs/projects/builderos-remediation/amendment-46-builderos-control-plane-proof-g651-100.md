<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G651 100. -->

Amendment 46 BuilderOS Control Plane Proof - G651-100
Proof-Closing Blueprint Note for `routes/lifeos-council-builder-routes.js` Wiring

This note addresses the follow-through signal for wiring `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints and associated handler logic to manage BuilderOS build lifecycle events. Specifically, the following are missing:
- A POST endpoint for `/build/start` to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
- A POST endpoint for `/build/complete` to trigger `recordBuildComplete` with `token` and `OIL receipt IDs`.
- Logic within the `/build/complete` handler to invoke `canMarkBuildDone` and return a 409 Conflict status if it fails (e.g., when system health is RED).
- The internal `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions need to be defined and exposed for import, or their existing implementations need to be identified and imported.

**2. Smallest Safe Build Slice to Close It:**
The minimal implementation involves:
- Adding two new POST routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
- Implementing asynchronous handler functions for each route.
- The `/build/start` handler will parse `task_id`, `blueprint_id`, and `model_used` from the request body and call `recordBuildStart`.
- The `/build/complete` handler will parse `token` and `oil_receipt_ids` from the request body.
- Before calling `recordBuildComplete`, the `/build/complete` handler will call `canMarkBuildDone`. If `canMarkBuildDone` returns `false` or throws an error indicating a RED health state, the handler will respond with a 409 status code.
- If `canMarkBuildDone` passes, the `/build/complete` handler will then call `recordBuildComplete`.
- Error handling for both routes to catch exceptions from internal service calls and respond with appropriate HTTP status codes (e.g., 500 for internal errors, 400 for bad requests).

**3. Exact Safe-Scope Files to Touch First:**
- `routes/lifeos-council-builder-routes.js`: This is the primary file for adding the new route definitions and their handlers.
- `services/builder-control-plane-service.js` (or similar existing internal service file): This file would be the logical place to define or expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` if they don't already exist. If they exist elsewhere, that file would be touched for export. For this proof, we assume a `builderControlPlaneService` module.

**4. Verifier/Runtime Checks:**
- **Unit Tests (`test/routes/lifeos-council-builder-routes.test.js`):**
    - Verify `POST /build/start` calls `builderControlPlaneService.recordBuildStart` with the correct `task_id`, `blueprint_id`, `model_used`.
    - Verify `POST /build/complete` calls `builderControlPlaneService.canMarkBuildDone` before `builderControlPlaneService.recordBuildComplete`.
    - Verify `POST /build/complete` returns 409 when `builderControlPlaneService.canMarkBuildDone` returns `false` (simulating RED health).
    - Verify `POST /build/complete` returns 200 (or 204) and calls `builderControlPlaneService.recordBuildComplete` with `token` and `oil_receipt_ids` when `canMarkBuildDone` returns `true`.
- **Integration Tests (`test/integration/builder-api.test.js`):**
    - Send a `POST` request to `/build/start` and assert a 2xx response and verify build start record in DB (if accessible).
    - Send a `POST` request to `/build/complete` with a scenario where `canMarkBuildDone` would fail, assert a 409 response.
    - Send a `POST` request to `/build/complete` with a scenario where `canMarkBuildDone` would pass, assert a 2xx response and verify build complete record in DB.
- **Runtime Monitoring:**
    - Observe application logs for successful `recordBuildStart` and `recordBuildComplete` events.
    - Monitor HTTP access logs for 409 responses from `/build/complete` during periods of system health degradation.

**5. Stop Conditions if Runtime Truth Disagrees:**
- If `POST /build/start` or `POST /build/complete` routes are not reachable or return unexpected HTTP status codes (e.g., 404, 500 for valid requests).
- If `recordBuildStart` or `recordBuildComplete` are not invoked by their respective route handlers, or are invoked with incorrect parameters.
- If the `/build/complete` endpoint does not return a 409 status when `canMarkBuildDone` indicates a failure condition (e.g., RED health).
- If the `/build/complete` endpoint returns a 409 status