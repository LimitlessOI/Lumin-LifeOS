Proof-Closing Blueprint Note: G381-100 - BuilderOS Control Plane Wiring
This note addresses the implementation gap identified in Amendment 46 regarding the BuilderOS control plane, specifically the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`.

1. Exact Missing Implementation or Proof Gap:
The core gap is the absence of API endpoints and their corresponding internal logic to manage the start and completion of BuilderOS builds, including a critical pre-completion health check. Specifically:
-   A `POST /build/start` endpoint in `routes/lifeos-council-builder-routes.js` to record the initiation of a build. This endpoint requires `task_id`, `blueprint_id`, and `model_used` in its payload. It must call an internal `recordBuildStart` function.
-   A `POST /build/complete` endpoint in `routes/lifeos-council-builder-routes.js` to record the successful completion of a build. This endpoint requires a `token` and `OIL receipt IDs` in its payload. It must call an internal `recordBuildComplete` function.
-   Integration of a `canMarkBuildDone` check within the `/build/complete` flow. If `canMarkBuildDone` fails when system health is RED, the endpoint must return a `409 Conflict` status, preventing build completion.

2. Smallest Safe Build Slice to Close It:
The smallest safe build slice involves:
-   Adding two new POST routes (`/build/start` and `/build/complete`) to `routes/lifeos-council-builder-routes.js`.
-   Implementing or extending internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` within the BuilderOS control plane logic (e.g., `services/builder-control-plane-service.js`).
-   Ensuring `canMarkBuildDone` accurately assesses system health and returns `false` when RED.
-   Wiring the `409 Conflict` response for the `/build/complete` endpoint based on the `canMarkBuildDone` result.

3. Exact Safe-Scope Files to Touch First:
-   `routes/lifeos-council-builder-routes.js` (for route definitions and middleware)
-   `services/builder-control-plane-service.js` (for core build lifecycle logic: `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`)
-   `utils/system-health.js` (if `canMarkBuildDone` relies on a shared health status utility)

4. Verifier/Runtime Checks:
-   **Unit Tests:**
    -   Verify `POST /build/start` correctly invokes `recordBuildStart` with the expected payload.
    -   Verify `POST /build/complete` correctly invokes `recordBuildComplete` with the expected payload.
    -   Verify `