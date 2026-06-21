<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G1053 100. -->

Amendment 46: BuilderOS Control Plane Proof - G1053-100
Proof-Closing Blueprint Note

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file lacks the necessary `POST /build/start` and `POST /build/complete` endpoints. Specifically:
    -   `POST /build/start` needs to call an internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
    -   `POST /build/complete` needs to call an internal `recordBuildComplete` function, passing a build token and OIL receipt IDs.
    -   The `POST /build/complete` endpoint must also incorporate a check using `canMarkBuildDone` and return a `409 Conflict` status if this check fails, particularly when the system health is RED.
    -   The underlying service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are either missing or require implementation/modification to support the specified logic and health checks.

2.  **Smallest Safe Build Slice to Close It**
    Implement the two new `POST` routes in `routes/lifeos-council-builder-routes.js`. Create or extend `services/builder-control-plane-service.js` to house the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. The `canMarkBuildDone` function will need to query the system health status.

3.  **Exact Safe-Scope Files to Touch First**
    -   `routes/lifeos-council-builder-routes.js`: Add route definitions and handlers.
    -   `services/builder-control-plane-service.js`: Implement or extend `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.
    -   `tests/unit/services/builder-control-plane-service.test.js`: Add unit tests for the new service functions.
    -   `tests/integration/routes/lifeos-council-builder-routes.test.js`: Add integration tests for the new API endpoints.

4.  **Verifier/Runtime Checks**
    -   **Unit Tests:** Verify `recordBuildStart` correctly logs build start events, `recordBuildComplete` correctly finalizes builds and associates OIL receipts, and `canMarkBuildDone` accurately reflects build completion eligibility based on system health.
    -   **Integration Tests:**
        -   `POST /build/start` with valid payload returns `200 OK` and triggers `recordBuildStart`.
        -   `POST /build/complete` with valid token and receipt IDs returns `200 OK` and triggers `recordBuildComplete`.
        -   `POST /build/complete` when `canMarkBuildDone` returns `false` (e.g., system health RED) returns `409 Conflict`.
    -   **Manual Verification:**
        -   Initiate a build via `/build/start` and confirm build start is logged.
        -   Complete a build via `/build/complete` and confirm build completion and OIL receipt linkage.
        -   Simulate a RED health state (if possible) and attempt `/build/complete` to verify `409 Conflict`.

5.  **Stop Conditions if Runtime Truth Disagrees**
    -   If API endpoints return unexpected HTTP status codes (e.g., `500 Internal Server Error` instead of `200 OK` or `409 Conflict`).
    -   If build state transitions (start, complete) are not accurately reflected in the underlying data store.
    -   If `canMarkBuildDone` logic does not correctly prevent build completion under specified conditions (e.g., RED health).
    -   If the verifier continues to flag the `.md` file as a syntax error, indicating a misconfiguration in the verifier's processing of documentation files, which would require escalation to the verifier team.