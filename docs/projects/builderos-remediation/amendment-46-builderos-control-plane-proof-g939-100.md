Amendment 46: BuilderOS Control Plane Proof - G939-100
Proof-Closing Blueprint Note

This note addresses the implementation gap identified in Amendment 46, specifically the wiring of BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js`.

1. Exact Missing Implementation or Proof Gap
The `routes/lifeos-council-builder-routes.js` file requires new or modified endpoints to:
    - Handle `POST /build/start` to internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
    - Handle `POST /build/complete` to internally call `recordBuildComplete` with a build token and OIL receipt IDs.
    - Implement a check using `canMarkBuildDone` before marking a build complete, returning a 409 Conflict status if `canMarkBuildDone` indicates a health RED state.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
    - Adding two new POST routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
    - Importing and calling `recordBuildStart` within the `/build/start` handler.
    - Importing and calling `recordBuildComplete` within the `/build/complete` handler.
    - Importing and calling `canMarkBuildDone` within the `/build/complete` handler, and conditionally returning 409.
    - Ensuring necessary data (task_id, blueprint_id, model_used, token, OIL receipt IDs) are extracted from the request body for the respective calls.

3. Exact Safe-Scope Files to Touch First
    - `routes/lifeos-council-builder-routes.js` (for route definitions and handlers).
    - `services/builder-control-plane.js` (assuming this file contains `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` or similar control plane logic; if not, a new service file would be created).

4. Verifier/Runtime Checks
    - **Functional Test 1 (Build Start):** Send `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used`. Expect 200 OK/202 Accepted. Verify `recordBuildStart` is invoked with correct parameters.
    - **Functional Test 2 (Build Complete - Success):** Send `POST /build/complete` with valid build token and OIL receipt IDs. Ensure `canMarkBuildDone` returns true. Expect 200 OK/202 Accepted. Verify `recordBuildComplete` is invoked with correct parameters.
    - **Functional Test 3 (Build Complete - Health RED):** Send `POST /build/complete` with valid build token and OIL receipt IDs. Configure `canMarkBuildDone` to return false (simulating health RED). Expect 409 Conflict. Verify `recordBuildComplete` is *not* invoked.
    - **Integration Test:** Confirm no regressions or side effects on existing BuilderOS workflows or any LifeOS user-facing features.

5. Stop Conditions if Runtime Truth Disagrees
    - If `recordBuildStart` or `recordBuildComplete` are not invoked as expected.
    - If the `/build/complete` endpoint does not return 409 when `canMarkBuildDone` indicates a health RED state.
    - If any existing BuilderOS control plane functionality is disrupted or altered.
    - If any LifeOS user features or TSOS customer-facing surfaces are inadvertently modified or impacted.