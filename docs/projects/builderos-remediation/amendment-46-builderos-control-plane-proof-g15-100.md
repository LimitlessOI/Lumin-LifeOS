Amendment 46: BuilderOS Control Plane Proof - G15-100
Proof-Closing Blueprint Note

This document outlines the necessary implementation to close the proof gap for BuilderOS control plane signaling, specifically for build start and completion events, and integrates health-based build completion gating.

1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of dedicated API endpoints and their corresponding internal service logic within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of BuilderOS builds. Specifically:
-   A `POST /build/start` endpoint to internally record build initiation with `task_id`, `blueprint_id`, and `model_used`.
-   A `POST /build/complete` endpoint to internally record build completion, requiring a build token and OIL receipt IDs.
-   Integration of a health check (`canMarkBuildDone`) into the `/build/complete` flow, returning a 409 conflict status if the BuilderOS health is RED.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
-   Defining two new POST routes in `routes/lifeos-council-builder-routes.js`.
-   Implementing the `recordBuildStart` and `recordBuildComplete` functions within a new or existing BuilderOS-specific service layer (e.g., `services/builder-control-plane.js`). These functions will handle persistence of build state.
-   Implementing the `canMarkBuildDone` function, likely within a `utils/builder-health.js` or `services/builder-control-plane.js`, which queries the current BuilderOS health status.
-   Integrating `canMarkBuildDone` into the `/build/complete` route handler to gate completion based on health.

3. Exact Safe-Scope Files to Touch First
-   `routes/lifeos-council-builder-routes.js`: Add new POST route definitions and their handlers.
-   `services/builder-control-plane.js` (new file, or extend existing if applicable): Implement `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. This file will encapsulate the business logic for build state management and health checks.
-   `tests/unit/services/builder-control-plane.test.js` (new file): Unit tests for the new service functions.
-   `tests/integration/routes/lifeos-council-builder-routes.test.js`: Integration tests for the new API endpoints.

4. Verifier/Runtime Checks
-   **Unit Tests:** Verify `recordBuildStart` correctly processes and persists build start data. Verify `recordBuildComplete` correctly processes and persists build completion data, including token and OIL receipt IDs. Verify `canMarkBuildDone` accurately reflects BuilderOS health status (RED/GREEN).
-   **Integration Tests:**
    -   `POST /build/start` with valid payload returns 200/202 and triggers `recordBuildStart`.
    -   `POST /build/complete` with valid payload (token, OIL receipt IDs) returns 200/202 and triggers `recordBuildComplete` when health is GREEN.
    -   `POST /build/complete` with valid payload returns 409 when `canMarkBuildDone` indicates health RED.
    -   Ensure no unintended side effects on existing BuilderOS or LifeOS functionality.
-   **Runtime Monitoring:** Observe BuilderOS control plane logs for successful `recordBuildStart` and `recordBuildComplete` events. Monitor HTTP response codes for `/build/complete` under various health conditions.

5. Stop Conditions if Runtime Truth Disagrees
-   If `recordBuildStart` or `recordBuildComplete` fail to correctly persist build state or return unexpected errors.
-   If `canMarkBuildDone` consistently returns an incorrect health status, leading to incorrect 409 responses or allowing completion when health is RED.
-   If the new routes introduce regressions or unexpected behavior in other parts of the BuilderOS or LifeOS platform.
-   If the 409 response for health RED is not consistently and reliably returned.
-   If the system exhibits performance degradation attributable to the new control plane logic.