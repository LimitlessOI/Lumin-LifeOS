# Amendment 46: BuilderOS Control Plane Proof (G38-100) - Proof Closing Blueprint Note

This document outlines the missing implementation and the smallest safe build slice to wire the BuilderOS control plane routes as specified in Amendment 46.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a build process (start and complete), including the necessary health-based pre-condition check for build completion. Specifically:

*   **`/build/start` (POST):** An endpoint to record the initiation of a build, requiring `task_id`, `blueprint_id`, and `model_used`.
*   **`/build/complete` (POST):** An endpoint to record the completion of a build, requiring a `token` and `oil_receipt_ids`. This endpoint must conditionally return a `409 Conflict` if the `canMarkBuildDone` check fails while the system health is `RED`.

This requires extending the existing router with new POST handlers and implementing the corresponding controller logic to interact with the BuilderOS control plane services.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:

1.  **Route Definition:** Adding two new POST routes (`/build/start` and `/build/complete`) to `routes/lifeos-council-builder-routes.js`.
2.  **Controller Logic:** Implementing two new controller functions (e.g., `recordBuildStartHandler` and `recordBuildCompleteHandler`) within `controllers/builderControlPlaneController.js` (or a similar, dedicated BuilderOS controller).
3.  **Service Integration (Stubs):** Within the controller functions, calling placeholder service methods (e.g., `builderControlPlaneService.recordBuildStart`, `builderControlPlaneService.recordBuildComplete`, `builderControlPlaneService.canMarkBuildDone`, `builderControlPlaneService.getSystemHealth`) that initially log inputs and return mock success/failure states. The actual persistence and complex logic for these service methods will be implemented in subsequent passes.
4.  **Error Handling:** Implementing the 409 conflict response logic for the `/build/complete` endpoint based on the `canMarkBuildDone` and health status.

This slice focuses purely on the API surface and the immediate controller-level orchestration, using stubs for deeper service logic to ensure the routing and basic flow are correct without impacting existing BuilderOS or LifeOS functionality.

## 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`
*   `controllers/builderControlPlaneController.js` (create if it doesn't exist, or extend an existing BuilderOS-specific controller)
*   `services/builderControlPlaneService.js` (create if it doesn't exist, or extend an existing BuilderOS-specific service for stubs)

## 4. Verifier/Runtime Checks