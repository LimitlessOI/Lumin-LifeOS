Amendment 46 BuilderOS Control Plane Proof - G215-100
This document serves as a proof-closing blueprint note for the BuilderOS Control Plane, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js` as per Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file currently lacks the implementation for the `POST /build` endpoint. This endpoint is required to:
    *   Initiate a build by calling `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   Complete a build by calling `recordBuildComplete` with a build token and OIL receipt IDs.
    *   Enforce a health check by returning a `409 Conflict` if `canMarkBuildDone` fails when the system health is RED, preventing build completion.

2.  **Smallest Safe Build Slice to Close It**
    Implement the `POST /build` route handler within `routes/lifeos-council-builder-routes.js`. This handler will need to parse incoming request bodies to determine if it's a build start or build complete event, call the appropriate internal functions (`recordBuildStart`, `recordBuildComplete`), and integrate the `canMarkBuildDone` health check.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: Add the `POST /build` route definition and its handler logic.
    *   `services/builder-control-plane-service.js` (or similar existing service): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are defined and accessible. If they don't exist, add them following existing service patterns.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** Create tests for the `POST /build` route handler to verify:
        *   Successful invocation of `recordBuildStart` with correct parameters on build start requests.
        *   Successful invocation of `recordBuildComplete` with correct parameters on build complete requests.
        *   Correct `409` response when `canMarkBuildDone` returns `false` (health RED) during a build complete attempt.
        *   Correct `200` or `201` response on successful start/complete.
    *   **Integration Tests:** Simulate a full BuilderOS loop:
        *   Send a `POST /build` (start) request and verify internal state/DB entries.
        *   Send a `POST /build` (complete) request and verify internal state/DB entries and OIL receipt processing.
        *   Introduce a simulated RED health state and attempt a build complete, verifying the `409` response.
    *   **OIL Verifier:** Ensure the modified `routes/lifeos-council-builder-routes.js` passes all existing OIL verifier checks for syntax, module resolution, and basic functionality.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` are not called or fail to update the build state/database as expected.
    *   If the `POST /build` endpoint does not correctly distinguish between build start and build complete payloads.
    *   If the `409` response is not returned when `canMarkBuildDone` indicates a RED health state during build completion, or if it's returned incorrectly in other scenarios.
    *   If the new route introduces any regressions or unexpected side effects in other BuilderOS control plane functionalities.
    *   If the OIL verifier flags new errors related to the route implementation or its dependencies.