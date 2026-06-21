<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G293 100. -->

Amendment 46: BuilderOS Control Plane Proof - G293-100
Proof-Closing Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`
This note addresses the required wiring of `routes/lifeos-council-builder-routes.js` to integrate build start and completion signals with the BuilderOS control plane, including health-based completion checks.

**1. Exact missing implementation or proof gap:**
The `routes/lifeos-council-builder-routes.js` file requires new `POST` endpoints for build lifecycle management.
- A `POST /build/start` endpoint is needed to internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
- A `POST /build/complete` endpoint is needed to internally call `recordBuildComplete({ token, oil_receipt_ids })`.
- The `POST /build/complete` endpoint must incorporate a check using `canMarkBuildDone()` and return a `409 Conflict` status if `canMarkBuildDone()` returns `false` when the system health is `RED`.
- The internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` (including its health check logic) need to be implemented or integrated from existing BuilderOS control plane services.

**2. Smallest safe build slice to close it:**
Implement the two new `POST` routes within `routes/lifeos-council-builder-routes.js`. For each route, define the handler logic to:
- Parse incoming request bodies for `task_id`, `blueprint_id`, `model_used` (for start) and `token`, `oil_receipt_ids` (for complete).
- Call the respective internal BuilderOS control plane functions (`recordBuildStart`, `recordBuildComplete`).
- For `/build/complete`, before calling `recordBuildComplete`, invoke `canMarkBuildDone()`. If it returns `false` under `RED` health conditions, respond with `409`. Otherwise, proceed with `recordBuildComplete` and respond with `200` or `202`.
- Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are either defined within a new BuilderOS service module or imported from an existing one.

**3. Exact safe-scope files to touch first:**
- `routes/lifeos-council-builder-routes.js`: Add new route definitions and their corresponding handler logic.
- `services/builderos-control-plane.js` (or similar existing BuilderOS service file): Implement or extend `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. This file should encapsulate the core BuilderOS state management and health checks.

**4. Verifier/runtime checks:**
- **Unit Tests:**
    - Verify `POST /build/start` successfully invokes `recordBuildStart` with correct parameters.
    - Verify `POST /build/complete` successfully invokes `recordBuildComplete` with correct parameters when `canMarkBuildDone` passes.
    - Verify `POST /build/complete` returns `409` when `canMarkBuildDone` fails due to `RED` health.
    - Verify `POST /build/complete` returns `200`/`202` when `canMarkBuildDone` passes (e.g., `GREEN` health).
- **Integration Tests:**
    - Simulate a full build lifecycle: call `/build/start`, then `/build/complete`. Verify BuilderOS internal state transitions correctly.
    - Introduce a `RED` health state, then attempt `/build/complete`. Verify `409` response and no state change.
- **Runtime Observation:**
    - Monitor BuilderOS logs for successful `recordBuildStart` and `recordBuildComplete` invocations during actual build processes.
    - Observe HTTP responses from `/build/complete` under various health conditions.

**5. Stop conditions if runtime truth disagrees:**
- If `recordBuildStart` or `recordBuildComplete` are not invoked or fail to update BuilderOS state as expected.
- If `POST /build/complete` does not return `409` when `canMarkBuildDone` indicates failure under `RED` health.
- If `POST /build/complete` returns `409` when `canMarkBuildDone` indicates success (e.g., `GREEN` health).
- If any existing BuilderOS or LifeOS Council functionality is negatively impacted or exhibits regressions.
- If the `OIL receipt IDs` are not correctly associated with the completed build.