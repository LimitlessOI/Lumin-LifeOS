<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G995 100. -->

Amendment 46: BuilderOS Control Plane Proof - G995-100
Proof-Closing Blueprint Note: Builder Control Plane Wiring

This document addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` to establish the BuilderOS control plane endpoints for build lifecycle management.

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary endpoint definitions and associated logic to manage the BuilderOS build lifecycle. Specifically, the `/build` start and complete endpoints are not wired, and the `canMarkBuildDone` health check for build completion is not integrated.

2.  **Smallest Safe Build Slice to Close It:**
    The minimal implementation slice involves:
    *   Adding a `POST /build/start` route handler to `routes/lifeos-council-builder-routes.js` that calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   Adding a `POST /build/complete` route handler to `routes/lifeos-council-builder-routes.js` that first checks `canMarkBuildDone()`. If `canMarkBuildDone()` returns false (indicating RED health), it must return a 409 Conflict status. Otherwise, it proceeds to call `recordBuildComplete` with the provided token and OIL receipt IDs.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js`: This file will be modified to define the new POST routes and their handlers.
    *   `services/builder-control-plane.js` (or similar existing internal service file): This file is the logical place to implement or extend `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` if they are not already present as internal utilities. For this build pass, assume these functions are imported from a `builderControlPlaneService`.

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests:**
        *   Verify `recordBuildStart` is invoked with correct `task_id`, `blueprint_id`, and `model_used` when `/build/start` is called.
        *   Verify `recordBuildComplete` is invoked with correct `token` and `OIL receipt IDs` when `/build/complete` is called and `canMarkBuildDone` is true.
        *   Verify `/build/complete` returns 409 when `canMarkBuildDone` is false.
    *   **Integration Tests:**
        *   Send POST requests to `/build/start` and assert a 2xx status code and correct internal state changes (e.g., build record created).
        *   Send POST requests to `/build/complete` (with `canMarkBuildDone` mocked to true) and assert a 2xx status code and correct internal state changes (e.g., build record updated).
        *   Send POST requests to `/build/complete` (with `canMarkBuildDone` mocked to false) and assert a 409 status code.
    *   **Runtime Monitoring:**
        *   Observe logs for successful `recordBuildStart` and `recordBuildComplete` calls.
        *   Monitor for 409 responses from `/build/complete` when BuilderOS health is known to be RED.
        *   Ensure no regressions or unexpected side effects on existing BuilderOS or LifeOS functionalities.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `/build/start` or `/build/complete` endpoints consistently return 5xx errors or unexpected 4xx errors (other than the intended 409).
    *   If build lifecycle events (start/complete) are not correctly recorded or persisted in the BuilderOS internal state.
    *   If the `canMarkBuildDone` health check logic fails to prevent build completion when health is RED, or incorrectly blocks completion when health is GREEN.
    *   If any existing BuilderOS control plane routes or LifeOS user features exhibit new, unexpected behavior or failures.