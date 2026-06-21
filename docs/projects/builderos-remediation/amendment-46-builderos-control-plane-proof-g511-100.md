<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G511 100. -->

The verifier's rejection indicates it attempted to execute a markdown file as JavaScript, which contradicts the explicit `.md` file extension requested for the output.
Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane Wiring (G511-100)

This note addresses the wiring of `routes/lifeos-council-builder-routes.js` to integrate BuilderOS control plane signals for build start and completion, including health-based pre-conditions.

1.  **Exact Missing Implementation or Proof Gap:**
    The primary gap is the absence of wired HTTP endpoints in `routes/lifeos-council-builder-routes.js` to handle BuilderOS build lifecycle events. Specifically:
    *   A `POST /build/start` endpoint to trigger `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   A `POST /build/complete` endpoint to trigger `recordBuildComplete` with `token` and `OIL receipt IDs`.
    *   Integration of a `canMarkBuildDone` health check within the `/build/complete` flow, returning a 409 Conflict status if the health is RED.

2.  **Smallest Safe Build Slice to Close It:**
    Implement the two new POST routes within `routes/lifeos-council-builder-routes.js`.
    *   For `/build/start`:
        *   Extract `task_id`, `blueprint_id`, `model_used` from the request body.
        *   Call an internal `builderControlPlaneService.recordBuildStart` function.
        *   Return a 200 OK or 202 Accepted response.
    *   For `/build/complete`:
        *   Call `builderControlPlaneService.canMarkBuildDone()`.
        *   If `canMarkBuildDone()` returns false (indicating RED health), return a 409 Conflict response immediately.
        *   Extract `token` and `oilReceiptIds` from the request body.
        *   Call an internal `builderControlPlaneService.recordBuildComplete` function.
        *   Return a 200 OK response.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their respective handler logic.
    *   `services/builder-control-plane-service.js` (or similar existing service): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are implemented or stubbed for initial integration. If this file does not exist, create it. (Assuming `builderControlPlaneService` is the chosen name for the service containing these functions).

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
        *   Verify `POST /build/start` calls `recordBuildStart` with correct payload.
        *   Verify `POST /build/complete` calls `recordBuildComplete` with correct payload.
        *   Verify `POST /build/complete` returns 409 when `canMarkBuildDone` is false.
        *   Verify `POST /build/complete` returns 200 when `canMarkBuildDone` is true and `recordBuildComplete` is called.
    *   **Integration Tests (e.g., using Supertest):**
        *   Send `POST /build/start` requests and assert 200/202 status and verify side effects (e.g., DB entry).
        *   Send `POST /build/complete` requests with varying `canMarkBuildDone` states (mocked or actual) and assert 409/200 statuses and side effects.
    *   **Runtime Monitoring:**
        *   Observe application logs for successful invocation of `recordBuildStart` and `recordBuildComplete` during actual build processes.
        *   Monitor HTTP access logs for `409 Conflict` responses from `/build/complete` when BuilderOS health is known to be RED.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `POST /build/start` or `POST /build/complete` routes are not reachable or return unexpected HTTP status codes (e.g., 404, 500) under normal conditions.
    *   If `recordBuildStart` or `recordBuildComplete` calls do not correctly persist build state or metadata as expected.
    *   If `POST /build/complete` returns a 200 OK when `canMarkBuildDone` indicates a RED health status.
    *   If `POST /build/complete` returns a 409 Conflict when `canMarkBuildDone` indicates a GREEN health status.
    *   If the `task_id`, `blueprint_id`, `model_used`, `token`, or `OIL receipt IDs` are not correctly extracted or passed to the respective service functions.