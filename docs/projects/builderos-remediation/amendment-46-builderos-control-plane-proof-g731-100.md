<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G731 100. -->

Amendment 46: BuilderOS Control Plane Proof - G731-100
Proof-Closing Blueprint Note

This note addresses the implementation gap identified in Amendment 46 regarding the BuilderOS control plane, specifically the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary endpoint handlers and middleware to manage the BuilderOS build lifecycle events as specified. Specifically:
    *   Missing `POST /build/start` endpoint to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
    *   Missing `POST /build/complete` endpoint to trigger `recordBuildComplete` with `token` and `OIL receipt IDs`.
    *   Missing health check integration within the `POST /build/complete` handler to invoke `canMarkBuildDone` and return a `409 Conflict` status if the health is `RED`.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves adding new `POST` route handlers to `routes/lifeos-council-builder-routes.js` and integrating existing internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`). This will involve:
    *   Defining a new `POST /build/start` route.
    *   Defining a new `POST /build/complete` route.
    *   Implementing request body parsing for `task_id`, `blueprint_id`, `model_used`, `token`, and `OIL receipt IDs`.
    *   Calling the respective internal service functions within these handlers.
    *   Adding conditional logic for `canMarkBuildDone` within the `/build/complete` handler.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: This is the primary file for adding the new route definitions and their associated logic.
    *   `services/builder-control-plane-service.js` (assumed): This file would contain the implementations for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. Imports from this file will be needed in the routes file.

4.  **Verifier/Runtime Checks**
    *   **Unit/Integration Tests:**
        *   `POST /build/start` with valid payload: Expect 200 OK and `recordBuildStart` to be called with the correct arguments.
        *   `POST /build/complete` with valid payload and `canMarkBuildDone` returning `GREEN`: Expect 200 OK and `recordBuildComplete` to be called with the correct arguments.
        *   `POST /build/complete` with valid payload and `canMarkBuildDone` returning `RED`: Expect 409 Conflict.
        *   `POST /build/start` or `POST /build/complete` with invalid/missing payload: Expect 400 Bad Request.
    *   **Runtime Monitoring:**
        *   Observe logs for successful invocation of `recordBuildStart` and `recordBuildComplete` during actual build lifecycle events.
        *   Monitor for 409 responses from `/build/complete` when health conditions are met, and 200 responses otherwise.
        *   Ensure no regressions on existing BuilderOS functionality.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `recordBuildStart` or `recordBuildComplete` functions are not found or throw unexpected errors during route handling.
    *   If the `canMarkBuildDone` function or its underlying health check mechanism is unavailable, misconfigured, or returns inconsistent states.
    *   If the route handlers fail to correctly parse or validate incoming request payloads for `task_id`, `blueprint_id`, `model_used`, `token`, or `OIL receipt IDs`.
    *   If the `/build/complete` endpoint returns a status other than 409 when `canMarkBuildDone` indicates `RED` health, or a status other than 200 (or success) when `GREEN`.
    *   If any existing BuilderOS control plane routes or functionalities are negatively impacted or cease to operate correctly.

ASSUMPTIONS:
-   Internal service functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are assumed to exist within a service file (e.g., `services/builder-control-plane-service.js`) and are ready for import and use. Their internal implementation is outside the scope of this wiring task.