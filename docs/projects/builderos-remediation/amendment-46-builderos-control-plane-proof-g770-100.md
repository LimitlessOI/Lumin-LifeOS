<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G770 100. -->

Amendment 46: BuilderOS Control Plane Proof - G770-100
This document serves as a proof-closing blueprint note for `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, detailing the implementation plan for wiring the build lifecycle endpoints within `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap:**
    The primary gap is the absence of wired endpoints in `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. Specifically:
    *   A `POST /build/start` endpoint to initiate a build, calling `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   A `POST /build/complete` endpoint to finalize a build, calling `recordBuildComplete` with `token` and `OIL receipt IDs`.
    *   The `/build/complete` endpoint must also incorporate a health check, returning a `409 Conflict` if `canMarkBuildDone()` indicates a RED health state.

2.  **Smallest Safe Build Slice to Close It:**
    The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to add the two new `POST` routes and their respective handlers. This includes importing necessary internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) and implementing the conditional `409` response.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js` (primary modification target)
    *   Potentially, `services/builderService.js` or similar, if `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not yet exposed or need minor interface adjustments (though the instruction implies they exist). For this proof, we assume they are importable.

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests:**
        *   Verify `POST /build/start` correctly calls `recordBuildStart` with expected parameters.
        *   Verify `POST /build/complete` correctly calls `recordBuildComplete` with expected parameters.
        *   Verify `POST /build/complete` returns `200 OK` when `canMarkBuildDone()` is green.
        *   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone()` is red.
    *   **Integration Tests:**
        *   Simulate a full build lifecycle: `POST /build/start` followed by `POST /build/complete`. Assert that build records are created/updated in the database.
        *   Test the `/build/complete` endpoint under simulated RED health conditions to confirm the `409` response.
    *   **Manual Verification:**
        *   Trigger a build via the new `/build/start` endpoint and observe logs/DB for `recordBuildStart` invocation.
        *   Manually complete a build via `/build/complete` and observe logs/DB for `recordBuildComplete` invocation and correct OIL receipt ID processing.
        *   Artificially set system health to RED and attempt `/build/complete` to confirm `409`.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 404, 500).
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked, or if their invocations do not correctly persist build state/metadata.
    *   If `POST /build/complete` does not return `409 Conflict` when `canMarkBuildDone()` indicates a RED health state, or if it returns `409` when health is GREEN.
    *   If the `task_id`, `blueprint_id`, `model_used`, `token`, or `OIL receipt IDs` are not correctly passed to the respective internal functions.
    *   If the BuilderOS governed loop execution is disrupted or behaves unexpectedly after these changes.