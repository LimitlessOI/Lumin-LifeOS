Amendment 46: BuilderOS Control Plane Proof - G1003-100

Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane Wiring

This note outlines the implementation plan to wire the BuilderOS control plane routes as specified in Amendment 46, focusing on the `/build` start and complete signals within `routes/lifeos-council-builder-routes.js`. This addresses the current proof gap by defining the necessary API endpoints and integrating the specified internal logic and health checks.

**1. Exact Missing Implementation or Proof Gap:**
The primary gap is the absence of API endpoints and their corresponding handler logic within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. Specifically:
*   A `POST /build/start` endpoint to trigger `recordBuildStart({ task_id, blueprint_id, model_used })`.
*   A `POST /build/complete` endpoint to trigger `recordBuildComplete` with `token` and `OIL receipt IDs`.
*   Integration of a `canMarkBuildDone` check before `recordBuildComplete`, returning a `409 Conflict` status if the system health is `RED`.

**2. Smallest Safe Build Slice to Close It:**
The smallest safe build slice involves:
*   **Route Definition:** Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`.
*   **Controller Logic:** Implementing or extending a dedicated controller (e.g., `builder-council-controller.js`) to handle the request parsing, call the internal `recordBuildStart` and `recordBuildComplete` functions, and perform the `canMarkBuildDone` check.
*   **Service Layer Integration:** Ensuring the `recordBuildStart` and `recordBuildComplete` functions (likely residing in a `builder-service.js` or similar) are callable and perform their intended internal operations (e.g., database updates, event emissions).
*   **Health Check Integration:** Implementing or calling the `canMarkBuildDone` function, which queries the system's health status.

**3. Exact Safe-Scope Files to Touch First:**
*   `routes/lifeos-council-builder-routes.js`: Add new `router.post` definitions for `/build/start` and `/build/complete`.
*   `controllers/builder-council-controller.js` (or similar existing controller): Implement `handleBuildStart`, `handleBuildComplete`, and a middleware/function for `canMarkBuildDone` logic. Create this file if it does not exist, following existing project patterns.
*   `services/builder-service.js` (or similar existing service): Implement or extend `recordBuildStart`, `recordBuildComplete`, and a function to retrieve system health for `canMarkBuildDone`. Create this file if it does not exist.

**4. Verifier/Runtime Checks:**
*   **Unit Tests:**
    *   Verify `recordBuildStart` service function correctly processes inputs and performs internal actions.
    *   Verify `recordBuildComplete` service function correctly processes inputs and performs internal actions.
    *   Verify `canMarkBuildDone` logic correctly returns `true` when health is `GREEN` and `false` (or throws) when `RED`.
*   **Integration Tests:**
    *   `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used` returns `202 Accepted` and triggers `recordBuildStart`.
    *   `POST /build/complete` with valid `token`, `oil_receipt_ids` returns `200 OK` and triggers `recordBuildComplete` when system health is `GREEN`.
    *   `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` fails due to `RED` system health.
*   **Manual Verification:**
    *   Use `curl` or a similar tool to send `POST` requests to `/build/start` and `/build/complete` endpoints.
    *   Observe system logs for `recordBuildStart` and `recordBuildComplete` events.
    *   Manually set system health to `RED` (if possible via dev tools