Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane - G35-100

This note addresses the implementation gap for wiring the BuilderOS control plane routes as specified in Amendment 46.

1.  **Exact Missing Implementation / Proof Gap:**
    The primary gap is the absence of the `/build/start` and `/build/complete` POST endpoints within `routes/lifeos-council-builder-routes.js`. These endpoints are crucial for signaling the beginning and completion of a build process within the BuilderOS-only governed loop. Specifically:
    *   A `POST /build/start` endpoint is required to internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   A `POST /build/complete` endpoint is required to internally call `recordBuildComplete` with a build token and OIL receipt IDs. This endpoint must also incorporate a health check: if `canMarkBuildDone` fails when the system health is RED, it must return a `409 Conflict` status.

2.  **Smallest Safe Build Slice to Close It:**
    The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to define the two new POST routes and their respective handler functions. These handlers will import and invoke the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions from a dedicated BuilderOS service layer. The service layer functions themselves are assumed to exist or will be implemented in a separate, companion build slice.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their corresponding middleware/handler logic.
    *   `services/builder-control-plane-service.js` (or similar existing BuilderOS service file): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are properly defined and exported. (This file is not directly modified in *this* slice, but its existence/structure is a prerequisite).

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
        *   Verify that `POST /build/start` correctly calls `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used` from the request body.
        *   Verify that `POST /build/complete` correctly calls `recordBuildComplete` with the provided token and OIL receipt IDs.
        *   Verify that `POST /build/complete` returns a `409 Conflict` status when `canMarkBuildDone` returns `false` and the system health is `RED`.
        *   Verify that `POST /build/complete` returns a `200 OK` (or appropriate success status) when `canMarkBuildDone` returns `true` or health is not `RED`.
    *   **Integration Tests (e.g., using Supertest):**
        *   Send valid `POST /build/start` requests and assert `200 OK` and expected side effects (e.g., log entries, mock service calls).
        *   Send valid `POST /build/complete` requests and assert `200 OK` and expected side effects.
        *   Send `POST /build/complete` requests under simulated `RED` health conditions where `canMarkBuildDone` fails, asserting `409 Conflict`.
    *   **Manual Verification:**
        *   Use `curl` or Postman to send requests to the new endpoints and observe server responses and logs.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `POST /build/start` or `POST /build/complete` routes are not registered or return `404 Not Found`.
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked or are invoked with incorrect parameters.
    *   If the `409 Conflict` status is not returned for `POST /build/complete` when `canMarkBuildDone` fails under `RED` health.
    *   If the system exhibits unexpected behavior, errors, or performance degradation after deployment of this slice.
    *   If the `canMarkBuildDone` function's interaction with system health status is incorrect or causes unintended state changes.