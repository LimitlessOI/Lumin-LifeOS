### Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane - G887-100

#### 1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of dedicated BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a build (start and complete events) with integrated health-based conditional completion. Specifically, the internal functions `recordBuildStart` and `recordBuildComplete` are not yet exposed via HTTP endpoints, nor is the `canMarkBuildDone` health check integrated into the build completion flow to enforce a 409 response when health is RED.

#### 2. Smallest Safe Build Slice to Close It
Implement two new POST endpoints within `routes/lifeos-council-builder-routes.js`:
-   `/build/start`: This endpoint will accept `task_id`, `blueprint_id`, and `model_used` in its request body and invoke `builderControlPlaneService.recordBuildStart` with these parameters.
-   `/build/complete`: This endpoint will accept `token` and `oil_receipt_ids` in its request body. Before calling `builderControlPlaneService.recordBuildComplete`, it will check `healthService.canMarkBuildDone()`. If `canMarkBuildDone()` returns false (indicating RED health), it will respond with a 409 status code. Otherwise, it will proceed to call `builderControlPlaneService.recordBuildComplete` with the provided token and OIL receipt IDs.

#### 3. Exact Safe-Scope Files to Touch First
-   `routes/lifeos-council-builder-routes.js`: Add new POST routes and their respective handler logic.
-   `services/builder-control-plane-service.js`: Define or extend this service to encapsulate `recordBuildStart` and `recordBuildComplete` logic.
-   `services/health-service.js`: Define or extend this service to provide the `canMarkBuildDone` function, which determines if a build can be marked complete based on system health.

#### 4. Verifier/Runtime Checks
-   **`/build/start` Endpoint:**
    -   Verify successful HTTP 200 response for valid POST requests containing `task_id`, `blueprint_id`, and `model_used`.
    -   Verify `builderControlPlaneService.recordBuildStart` is invoked with the correct parameters (using