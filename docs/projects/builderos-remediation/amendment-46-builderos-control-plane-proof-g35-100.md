<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G35 100. -->

The OIL verifier rejection indicates an issue with the verifier attempting to execute a markdown file as a JavaScript module, which is external to the content of this markdown document.
Amendment 46: BuilderOS Control Plane Proof - G35-100

This document serves as a proof-closing blueprint note for `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js` for build start and completion events.

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary route definitions and handlers to:
*   Intercept `POST /build/start` requests and call `recordBuildStart({ task_id, blueprint_id, model_used })`.
*   Intercept `POST /build/complete` requests and call `recordBuildComplete` with `token` and `OIL receipt IDs`.
*   Implement a pre-condition check for `POST /build/complete` using `canMarkBuildDone` and return a `409 Conflict` if it fails when the system health is RED.

**2. Smallest Safe Build Slice to Close It:**
Introduce two new `POST` routes within `routes/lifeos-council-builder-routes.js`:
*   `/build/start`: A handler that extracts `task_id`, `blueprint_id`, `model_used` from the request body and calls `recordBuildStart`.
*   `/build/complete`: A handler that first checks `canMarkBuildDone`. If `canMarkBuildDone` returns `false` and system health is RED, respond with `409 Conflict`. Otherwise, extract `token` and `OIL receipt IDs` from the request body and call `recordBuildComplete`.

**3. Exact Safe-Scope Files to Touch First:**
*   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their respective handlers.
*   `services/builder-control-plane-service.js` (or similar existing service): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are implemented and exposed. If they don't exist, they should be added here following existing service patterns.

**4. Verifier/Runtime Checks:**
*   **Unit/Integration Tests:**
    *   Verify `POST /build/start` successfully calls `recordBuildStart` with correct `task_id`, `blueprint_id`, and `model_used` parameters.
    *   Verify `POST /build/complete` successfully calls `recordBuildComplete` with correct `token` and `OIL receipt IDs` when `canMarkBuildDone` passes or system health is not RED.
    *   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` fails and system health is RED.
*   **Manual/E2E Checks:**
    *   Trigger a build start event via `POST /build/start` and confirm `recordBuildStart` logs/persists the event.
    *   Trigger a build complete event via `POST /build/complete` and confirm `recordBuildComplete` logs/persists the event and associated OIL receipts.
    *   Simulate a RED health state and a failing `canMarkBuildDone` condition, then attempt to complete a build via `POST /build/complete`, verifying the `409 Conflict` response.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If `recordBuildStart` or `recordBuildComplete` calls do not result in persistent event records.
*   If `POST /build/complete` does not return `409 Conflict` when `canMarkBuildDone` fails and system health is RED.
*   If the parameters passed to `recordBuildStart` or `recordBuildComplete` are incorrect or incomplete.