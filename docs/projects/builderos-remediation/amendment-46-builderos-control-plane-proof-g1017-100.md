Amendment 46: BuilderOS Control Plane Proof - G1017-100
This document serves as a proof-closing blueprint note for the implementation of BuilderOS control plane build lifecycle management within `routes/lifeos-council-builder-routes.js`.

1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of dedicated API endpoints and their corresponding handler logic within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. Specifically, there are no routes to initiate a build record (`recordBuildStart`) or to mark a build as complete (`recordBuildComplete`), nor is there an integrated health check (`canMarkBuildDone`) to gate build completion based on system health.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves adding two new `POST` endpoints to `routes/lifeos-council-builder-routes.js` and their respective handler functions. These handlers will import and call existing internal service functions for build record management and health checks.

   - **Endpoint 1: Build Start**
     - **Path:** `/build/start`
     - **Method:** `POST`
     - **Action:** Call `recordBuildStart({ task_id, blueprint_id, model_used })` with parameters extracted from the request body.
     - **Expected Response:** 200 OK on success, 500 Internal Server Error on failure of `recordBuildStart`.

   - **Endpoint 2: Build Complete**
     - **Path:** `/build/complete`
     - **Method:** `POST`
     - **Action:**
       1. Call `canMarkBuildDone()` to check system health.
       2. If `canMarkBuildDone()` returns `false` (indicating RED health), return `409 Conflict`.
       3. If health is OK, call `recordBuildComplete({ token, oil_receipt_ids })` with parameters extracted from the request body.
     - **Expected Response:** 200 OK on success, 409 Conflict if health is RED, 500 Internal Server Error on failure of `recordBuildComplete`.

3. Exact Safe-Scope Files to Touch First
   - `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new `POST` routes and their handler logic.
   - `services/builderService.js` (or similar existing service layer): This file is assumed to contain (or will be extended to contain) the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. No direct modification to this file is part of *this* build slice, but its existence and API are assumed.

4. Verifier/Runtime Checks
   - **Unit Tests:**
     - Verify `POST /build/start` correctly calls `recordBuildStart` with parsed body parameters.
     - Verify `POST /build/complete` calls `canMarkBuildDone`.
     - Verify `POST /build/complete` returns `409` when `canMarkBuildDone` returns `false`.
     - Verify `POST /build/complete` calls `recordBuildComplete` with parsed body parameters when `canMarkBuildDone` returns `true`.
   - **Integration Tests:**
     - Send a `POST` request to `/build/start` and assert a `200` response and that a build record is initiated in the underlying data store.
     - Simulate a RED health state (e.g., by mocking `canMarkBuildDone` to return `false`) and send a `POST` request to `/build/complete`, asserting a `409` response.
     - Simulate a GREEN health state and send a `POST` request to `/build/complete`, asserting a `200` response and that the build record is marked complete with correct OIL receipt IDs.
   - **OIL Verifier Re-run:** Ensure the entire BuilderOS loop passes the OIL verifier without syntax or logical errors related to these changes.

5. Stop Conditions if Runtime Truth Disagrees
   - If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 404, 400 for valid requests).
   - If `recordBuildStart` or `recordBuildComplete` are not invoked or fail to persist data as expected, even when the API returns 200.
   - If the `409 Conflict` response is not consistently returned when `canMarkBuildDone` indicates a RED health state, or if it's returned when health is GREEN.
   - If the OIL verifier continues to reject the changes, indicating a deeper architectural or semantic mismatch that requires re-evaluation of the blueprint or the platform's current state.