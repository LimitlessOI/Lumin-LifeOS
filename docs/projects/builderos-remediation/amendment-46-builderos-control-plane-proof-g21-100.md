### Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane (G21-100)

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` file requires new `POST` endpoints and associated logic to manage the BuilderOS build lifecycle. Specifically:
- A `POST /build/start` route is missing to trigger the internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
- A `POST /build/complete` route is missing to trigger the internal `recordBuildComplete` function with `token` and `OIL receipt IDs`.
- The `POST /build/complete` route needs to integrate a check using `canMarkBuildDone` and return a `409 Conflict` status if `canMarkBuildDone` fails when the system health is RED.

**2. Smallest Safe Build Slice to Close It:**
Implement the two new `POST` routes (`/build/start` and `/build/complete`) within `routes/lifeos-council-builder-routes.js`. The handlers for these routes will call the respective internal functions (`recordBuildStart`, `recordBuildComplete`) and incorporate the `canMarkBuildDone` health check logic as specified. This slice is confined to the BuilderOS control plane and does not impact LifeOS user features or TSOS customer-facing surfaces.

**3. Exact Safe-Scope Files to Touch First:**
- `routes/lifeos-council-builder-routes.js`: Add the new `POST` routes and their corresponding handler functions. These handlers will import and utilize `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` (assuming these functions are available from an existing internal BuilderOS service or utility layer).

**4. Verifier/Runtime Checks:**
- **Unit Tests:**
    - Verify `POST /build/start` successfully invokes `recordBuildStart` with the expected `task_id`, `blueprint_id`, and `model_used` from the request body.
    - Verify `POST /build/complete` successfully invokes `recordBuildComplete` with the provided `token` and `OIL receipt IDs`.
    - Verify `POST /build/complete` returns `200 OK` when `canMarkBuildDone` permits completion or health is not RED.
    - Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` fails and the system health is RED.
- **Integration Tests:**
    - Simulate a complete build flow by sequentially calling `/build/start` and then `/build/complete` to confirm end-to-end functionality and state transitions within BuilderOS.
- **Manual API Testing:**
    - Use `curl` or a similar tool to directly interact with the new endpoints, observing HTTP responses and verifying expected side effects (e.g., log entries, database updates).
- **Logging:**
    - Confirm that build start, build complete, and `canMarkBuildDone` failure events are logged appropriately for operational visibility.

**5. Stop Conditions if Runtime Truth Disagrees:**
- If the new `POST /build/start` or `POST /build/complete` routes are not reachable or return unexpected HTTP status codes (e.g., 404, 500) during testing.
- If `recordBuildStart` or `recordBuildComplete` are not invoked or fail to correctly update BuilderOS internal state.
- If the `409 Conflict` response for `canMarkBuildDone` failure (when health is RED) is not consistently observed.
- If any existing BuilderOS functionality or other system components exhibit regressions or unexpected behavior.
- If the OIL verifier continues to reject the `.md` file due to `ERR_UNKNOWN_FILE_EXTENSION`, indicating an environmental issue with the verifier's processing of markdown files that would block verification regardless of content correctness.