<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G772 100. -->

The specification is contradictory: the task requests a `.md` file, but the verifier attempts to execute it as a Node.js module, leading to `ERR_UNKNOWN_FILE_EXTENSION`.
Amendment 46: BuilderOS Control Plane Proof - G772-100

Proof-Closing Blueprint Note: Builder Control Plane Route Wiring Remediation

This document outlines the necessary steps to close the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`, as specified by Amendment 46, following the OIL verifier rejection.

1.  **Exact Missing Implementation or Proof Gap:**
    The core gap is the incomplete wiring of the BuilderOS control plane within `routes/lifeos-council-builder-routes.js`. Specifically:
    *   Missing `POST /build/start` route to call `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   Missing `POST /build/complete` route to call `recordBuildComplete` with token and OIL receipt IDs.
    *   Missing health check integration for `canMarkBuildDone` within the `/build/complete` route, which should return a 409 status if health is RED.

2.  **Smallest Safe Build Slice to Close It:**
    The smallest safe build slice involves adding the two new POST routes and integrating the health check logic. This can be achieved by:
    *   Defining a new `router.post('/build/start', ...)` handler.
    *   Defining a new `router.post('/build/complete', ...)` handler.
    *   Importing or accessing the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions within `routes/lifeos-council-builder-routes.js`.
    *   Implementing the conditional 409 response based on `canMarkBuildDone`'s return value.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js`: This is the primary file for modification.
    *   (Potential) `services/builder-control-plane.js` or similar: If `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not directly available or need to be encapsulated, a new or existing service file might be touched to ensure these functions are properly defined and exported. For this remediation, we assume they are available for import or are stubs within the existing `routes` context.

4.  **Verifier/Runtime Checks:**
    *   **Unit/Integration Test:** Verify that `POST /build/start` successfully calls `recordBuildStart` with correct parameters and returns a 200/202 status.
    *   **Unit/Integration Test:** Verify that `POST /build/complete` successfully calls `recordBuildComplete` with correct parameters and returns a 200/202 status when `canMarkBuildDone` is GREEN.
    *   **Unit/Integration Test:** Verify that `POST /build/complete` returns a 409 status when `canMarkBuildDone` is RED, without calling `recordBuildComplete`.
    *   **Runtime Observation:** Monitor logs for successful `recordBuildStart` and `recordBuildComplete` calls during BuilderOS loop execution.
    *   **Runtime Observation:** Observe BuilderOS loop behavior when health is RED; builds should not complete via the API.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `POST /build/start` or `POST /build/complete` routes are inaccessible, return unexpected HTTP status codes (e.g., 5xx), or fail to process requests.
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked or are invoked with incorrect parameters.
    *   If the `canMarkBuildDone` health check does not correctly prevent build completion (i.e., `POST /build/complete` returns 200/202 when health is RED).
    *   If any existing functionality within `routes/lifeos-council-builder-routes.js` is broken or exhibits regressions.
    *   If the BuilderOS loop fails to progress or enters an unrecoverable state due to these changes.