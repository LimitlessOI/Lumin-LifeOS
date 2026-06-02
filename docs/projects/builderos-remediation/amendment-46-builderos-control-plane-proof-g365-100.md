Amendment 46: BuilderOS Control Plane Proof - G365-100 Remediation Note

This document outlines the proof-closing steps for integrating BuilderOS control plane signals into the LifeOS Council builder routes, specifically addressing the build start and completion lifecycle events.

1.  **Exact Missing Implementation or Proof Gap**
    The primary gap is the absence of a robust `POST /build` endpoint within `routes/lifeos-council-builder-routes.js` that correctly orchestrates build lifecycle events. Specifically, the current implementation lacks:
    *   An initial `POST /build` handler to invoke `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   A subsequent mechanism (likely a `PUT` or another `POST` to `/build/complete` or a stateful update on the initial `/build` endpoint) to invoke `recordBuildComplete` with `token` and `OIL receipt IDs`.
    *   Conditional logic to check `canMarkBuildDone` when health is RED and return a `409 Conflict` status if it fails, preventing build completion.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves:
    *   Adding or modifying the `POST /build` handler in `routes/lifeos-council-builder-routes.js` to handle the build start event.
    *   Introducing a new endpoint (e.g., `POST /build/complete`) or extending the existing `/build` endpoint's state machine to handle build completion.
    *   Integrating calls to `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` (with health check) within these handlers.
    *   Ensuring proper dependency injection or import of the build lifecycle service functions.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: Primary file for adding/modifying route handlers.
    *   `services/build-lifecycle-service.js` (or similar existing service): To implement or expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` if they don't already exist or need modification.
    *   `utils/health-check.js` (or similar): To retrieve the current system health status for `canMarkBuildDone` evaluation.
    *   `tests/unit/lifeos-council-builder-routes.test.js`: For new unit tests covering the route logic.
    *   `tests/integration/builderos-lifecycle.test.js`: For end-to-end integration tests.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** Verify that `recordBuildStart` is called with correct parameters on `/build` POST. Verify `recordBuildComplete` is called with correct parameters on build completion. Verify `409 Conflict` is returned when `canMarkBuildDone` fails under RED health.
    *   **Integration Tests:** Simulate a full build lifecycle via the `/build` endpoints, asserting that all lifecycle events are correctly recorded and that the 409 condition is met when health is artificially set to RED.
    *   **Runtime Monitoring:** Observe BuilderOS execution logs for successful invocation of `recordBuildStart` and `recordBuildComplete` during normal operations. Monitor for `409 Conflict` responses in API logs when BuilderOS attempts to mark a build done under degraded health conditions.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` are not consistently invoked or are invoked with incorrect data during BuilderOS loop execution.
    *   If the system fails to return a `409 Conflict` when `canMarkBuildDone` indicates a failure under RED health, allowing builds to complete inappropriately.
    *   If the changes introduce regressions in other BuilderOS or LifeOS Council functionalities.
    *   If the OIL verifier continues to report functional failures related to the build lifecycle state management, indicating the proof gap was not fully closed.