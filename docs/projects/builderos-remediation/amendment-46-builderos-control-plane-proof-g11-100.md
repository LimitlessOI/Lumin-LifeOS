Amendment 46: BuilderOS Control Plane Proof - G11-100
Proof-Closing Blueprint Note
This note addresses the wiring of BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as specified by Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The primary gap is the absence of dedicated API endpoints and their corresponding controller/service logic within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. Specifically:
    *   A `POST /build/start` endpoint to internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   A `POST /build/complete` endpoint to internally call `recordBuildComplete` with a build token and OIL receipt IDs.
    *   Logic within the `/build/complete` flow to check `canMarkBuildDone` and return a 409 status if the health is RED.

2.  **Smallest Safe Build Slice to Close It**
    Implement the two new `POST` routes in `routes/lifeos-council-builder-routes.js`. Create corresponding controller functions to handle request parsing, call the appropriate internal BuilderOS control plane services (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`), and manage response logic, including the 409 conflict for health RED states.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: Add new `router.post('/build/start', ...)` and `router.post('/build/complete', ...)` definitions.
    *   `controllers/builder-council-controller.js`: Implement `handleBuildStart` and `handleBuildComplete` functions. These functions will encapsulate the request validation, service calls, and response generation.
    *   `services/builder-control-plane-service.js`: Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are exposed and correctly implemented for internal use. (Assuming these exist or need minimal extension).

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:**
        *   `controllers/builder-council-controller.js`: Verify `handleBuildStart` correctly calls `recordBuildStart` with parsed payload. Verify `handleBuildComplete` correctly calls `recordBuildComplete` and handles the 409 condition based on `canMarkBuildDone`'s return value.
    *   **Integration Tests:**
        *   `POST /build/start`: Send valid `task_id`, `blueprint_id`, `model_used`. Expect 200 OK. Verify `recordBuildStart` side-effects (e.g., database entry, log).
        *   `POST /build/complete`: Send valid `token` and `oil_receipt_ids`. Expect 200 OK. Verify `recordBuildComplete` side-effects.
        *   `POST /build/complete` (Health RED): Mock `canMarkBuildDone` to return false (indicating RED health). Send valid `token` and `oil_receipt_ids`. Expect 409 Conflict.
    *   **Manual Verification:** Initiate a build process via BuilderOS, observe logs for `recordBuildStart` and `recordBuildComplete` calls. Manually trigger a health RED state (if possible) and attempt to complete a build to confirm 409 response.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked or fail to record build state correctly.
    *   If the `/build/complete` endpoint does not return 409 when `canMarkBuildDone` indicates a RED health status.
    *   If the new endpoints introduce regressions or unexpected behavior in existing BuilderOS or LifeOS functionalities.
    *   If performance degradation is observed under load for these new control plane endpoints.