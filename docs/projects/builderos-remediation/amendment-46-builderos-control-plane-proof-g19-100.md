Proof-Closing Blueprint Note: G19-100 - BuilderOS Control Plane Wiring Remediation

This note addresses the wiring of BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46, following the OIL verifier rejection. The previous rejection was due to the verifier attempting to execute the markdown file as a JavaScript module, indicating a misconfiguration in the verifier's execution context for documentation files. This remediation focuses on the content of the blueprint note itself, detailing the required implementation.

1.  **Exact Missing Implementation or Proof Gap:**
    The primary gap is the absence of the following API endpoints and their corresponding logic within `routes/lifeos-council-builder-routes.js`:
    *   `POST /build`: An endpoint to initiate a build process, calling an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used` from the request body.
    *   `POST /build/complete`: An endpoint to finalize a build process, calling an internal `recordBuildComplete` function with a build token and OIL receipt IDs from the request body. This endpoint must also incorporate a health check using `canMarkBuildDone` and return a `409 Conflict` status if the health check fails (i.e., health is RED).

2.  **Smallest Safe Build Slice to Close It:**
    The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to introduce the two new POST endpoints and their respective handler logic. This includes:
    *   Importing necessary internal utility functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).
    *   Defining the route handlers to parse request bodies, call the appropriate internal functions, and handle responses, including the conditional 409 status.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js` (for adding the new routes and their handlers).

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
        *   Verify `POST /build` successfully calls `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used` from the request body.
        *   Verify `POST /build/complete` successfully calls `recordBuildComplete` with the provided token and OIL receipt IDs.
        *   Verify `POST /build/complete` returns `200 OK` when `canMarkBuildDone` passes.
        *   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` fails (health RED).
        *   Verify input validation for required parameters on both endpoints.
    *   **Integration Tests:**
        *   Deploy the updated `lifeos-council-builder-routes.js` to a staging environment.
        *   Execute a full BuilderOS loop: trigger `/build`, then `/build/complete`, and verify the state transitions and data persistence (e.g., build records in the database).
        *   Simulate a "RED" health state for `canMarkBuildDone` and confirm the `/build/complete` endpoint correctly returns 409.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` functions are not resolvable or throw unexpected errors during runtime.
    *   If the `POST /build` endpoint does not correctly parse and pass `task_id`, `blueprint_id`, or `model_used`.
    *   If the `POST /build/complete` endpoint does not correctly parse and pass the build token or OIL receipt IDs.
    *   If the `canMarkBuildDone` health check logic does not accurately reflect the system's health state or the `409 Conflict` response is not triggered under RED health conditions.
    *   If build state transitions (e.g., from 'started' to 'completed') are not correctly recorded or reflected in the underlying data store.

ASSUMPTIONS:
- The functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are assumed to be internal utility functions available for import within `routes/lifeos-council-builder-routes.js`, likely residing in a `services/builder-control-plane.js` or similar module. Their internal implementation details are outside the scope of this wiring task.