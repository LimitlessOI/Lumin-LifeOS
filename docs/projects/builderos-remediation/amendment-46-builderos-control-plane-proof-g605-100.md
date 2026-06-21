<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G605 100. -->

Amendment 46: BuilderOS Control Plane Proof - G605-100

Proof-Closing Blueprint Note

This document outlines the implementation plan and verification steps for wiring the BuilderOS control plane build lifecycle events within `routes/lifeos-council-builder-routes.js`, as per Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file lacks the necessary middleware or handler logic to:
    *   Intercept `POST /build` start events and call an internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
    *   Intercept `POST /build` complete events and call an internal `recordBuildComplete` function with a build token and OIL receipt IDs.
    *   Perform a health check using `canMarkBuildDone` before marking a build complete, returning a 409 Conflict status if the health is RED and `canMarkBuildDone` fails.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves modifying the existing `POST /build` route handler(s) in `routes/lifeos-council-builder-routes.js` to integrate the specified lifecycle event recording and health check logic. This will likely involve adding calls to existing or newly imported internal utility functions.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`
    *   (Potentially) A new or existing internal utility file (e.g., `services/build-lifecycle.js` or `utils/builder-health.js`) if `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not already defined or imported within the routes file. For this pass, assume these functions are either available for import or will be stubbed internally.

4.  **Verifier/Runtime Checks**
    *   **Unit/Integration Tests:**
        *   Verify that a `POST /build` request (representing build start) successfully invokes `recordBuildStart` with the expected `task_id`, `blueprint_id`, and `model_used` from the request body.
        *   Verify that a `POST /build` request (representing build complete) successfully invokes `recordBuildComplete` with the provided build token and OIL receipt IDs.
        *   Verify that a `POST /build` request (representing build complete) returns a 409 status code if `canMarkBuildDone` returns `false` (simulating RED health).
        *   Verify that a `POST /build` request (representing build complete) proceeds normally (e.g., 200 OK) if `canMarkBuildDone` returns `true`.
    *   **Runtime Observation:**
        *   Monitor logs for successful invocation messages from `recordBuildStart` and `recordBuildComplete` during actual build processes.
        *   Observe the BuilderOS control plane dashboard or database for accurate build start/complete records.
        *   Intentionally trigger a RED health state and attempt to complete a build to confirm the 409 response.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked as expected during build lifecycle events.
    *   If the data passed to `recordBuildStart` or `recordBuildComplete` is incorrect or incomplete.
    *   If the `POST /build` (complete) endpoint does not return a 409 status when `canMarkBuildDone` indicates a failure due to RED health.
    *   If the route handler crashes or produces unexpected errors during build start or complete events.
    *   If the implementation introduces regressions to other BuilderOS control plane functionalities.