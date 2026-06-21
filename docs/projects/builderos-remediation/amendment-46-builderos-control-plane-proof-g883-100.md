<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G883 100. -->

Amendment 46: BuilderOS Control Plane Proof - G883-100
This document serves as a proof-closing blueprint note for `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, specifically addressing the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary endpoints and associated logic to manage the BuilderOS build lifecycle as specified. Specifically, the implementation for:
    -   A `POST /build/start` endpoint to initiate a build, calling an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used`.
    -   A `POST /build/complete` endpoint to finalize a build, calling an internal `recordBuildComplete` function with a build token and OIL receipt IDs.
    -   Conditional error handling on `POST /build/complete` to return a `409 Conflict` if `canMarkBuildDone` indicates a RED health state.

2.  **Smallest Safe Build Slice to Close It:**
    The minimal implementation slice involves:
    -   Defining two new `POST` routes within `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
    -   Implementing handler functions for these routes that perform input validation and call the respective internal service functions (`recordBuildStart`, `recordBuildComplete`).
    -   Integrating a check for `canMarkBuildDone` within the `/build/complete` handler, returning `409` if the check fails.
    -   Ensuring `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are imported from their respective service modules (e.g., `../services/builderService.js` or similar existing pattern).

3.  **Exact Safe-Scope Files to Touch First:**
    -   `routes/lifeos-council-builder-routes.js`: Primary file for adding new route definitions and their handlers.
    -   `services/builderService.js` (or equivalent existing service file): To ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are properly defined and exported, or to add them if they are missing.

4.  **Verifier/Runtime Checks:**
    -   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
        -   Verify `POST /build/start` calls `recordBuildStart` with correct payload and returns 200/201.
        -   Verify `POST /build/complete` calls `recordBuildComplete` with correct payload and returns 200/201.
        -   Verify `POST /build/complete` returns 409 when `canMarkBuildDone` returns false (simulating RED health).
        -   Verify input validation for both endpoints (e.g., missing `task_id`, `token`).
    -   **Integration Tests (via BuilderOS E2E suite):**
        -   Execute a full build cycle: call `/build/start`, simulate build process, then call `/build/complete`. Verify end-to-end data flow and state changes.
        -   Trigger a RED health state for `canMarkBuildDone` and attempt `/build/complete` to confirm 409 response.
    -   **Manual Verification:**
        -   Use `curl` or Postman to hit the new endpoints and observe responses and logs.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    -   If `POST /build/start` or `POST /build/complete` consistently return 5xx errors or unexpected 4xx errors (other than the intended 409).
    -   If `recordBuildStart` or `recordBuildComplete` calls do not result in the expected state changes or data persistence in the BuilderOS control plane.
    -   If the `409 Conflict` response for `canMarkBuildDone` failure is not reliably triggered or is triggered incorrectly.
    -   If existing BuilderOS control plane functionalities are negatively impacted (e.g., other routes fail, performance degradation).
    -   If the OIL verifier rejects the build due to new syntax errors or unhandled exceptions introduced by this change.