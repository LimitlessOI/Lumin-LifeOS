<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G99 100. -->

Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane (G99-100)
This document closes the proof gap identified in `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md` regarding the wiring of build lifecycle events within the BuilderOS control plane.

1. Exact Missing Implementation or Proof Gap:
The `routes/lifeos-council-builder-routes.js` file lacks the necessary endpoint implementations to manage the BuilderOS build lifecycle events. Specifically, it needs:
    - A `POST /build/start` endpoint to initiate a build, calling `recordBuildStart({ task_id, blueprint_id, model_used })`.
    - A `POST /build/complete` endpoint to finalize a build, calling `recordBuildComplete` with a build token and OIL receipt IDs.
    - Logic within the `POST /build/complete` endpoint to check `canMarkBuildDone()` and return a `409 Conflict` status if this check fails (e.g., when health is RED).

2. Smallest Safe Build Slice to Close It:
Implement two new `POST` routes within `routes/lifeos-council-builder-routes.js` for `/build/start` and `/build/complete`. These routes will import and utilize existing internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) to manage build state and enforce control plane policies.

3. Exact Safe-Scope Files to Touch First:
    - `routes/lifeos-council-builder-routes.js`: Add the new POST route definitions and their associated handler logic.
    - `services/builder-control-plane-service.js` (or similar): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly defined and exported for use by the routes.
    - `utils/health-check.js` (or similar): Verify the `canMarkBuildDone` function correctly assesses system health status.

4. Verifier/Runtime Checks:
    - **Unit/Integration Tests:**
        - Verify `POST /build/start` successfully calls `recordBuildStart` with the correct payload and returns a 200/202 status.
        - Verify `POST /build/complete` successfully calls `recordBuildComplete` with the correct token and OIL receipt IDs when `canMarkBuildDone` is true, returning a 200/202 status.
        - Verify `POST /build/complete` returns a `409 Conflict` status when `canMarkBuildDone` is false (e.g., simulated RED health state).
        - Verify `recordBuildStart` and `recordBuildComplete` correctly persist build state in the underlying data store.
    - **End-to-End Flow:**
        - Initiate a build via `/build/start`, observe build record creation.
        - Complete the build via `/build/complete`, observe build record update and OIL receipt association.
        - Simulate a RED health state and attempt to complete a build; confirm 409 response.

5. Stop Conditions if Runtime Truth Disagrees:
    - If `recordBuildStart` or `recordBuildComplete` fail to update the build state correctly in the database.
    - If the `/build/complete` endpoint does not return a `409 Conflict` when `canMarkBuildDone` indicates a RED health state.
    - If the routes are not accessible or return unexpected server errors (e.g., 500) under valid input.
    - If the verifier continues to report syntax errors for the `.md` file itself, indicating an environmental issue with the verifier rather than the content.