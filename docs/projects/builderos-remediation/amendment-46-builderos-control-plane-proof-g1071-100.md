# Amendment 46: BuilderOS Control Plane Proof - G1071-100

## Proof-Closing Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This document outlines the necessary implementation to wire the BuilderOS control plane routes for build start and completion, including health-based conditional responses.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module currently lacks the necessary POST endpoint(s) to:
*   Initiate a build record (`recordBuildStart`) with `task_id`, `blueprint_id`, and `model_used`.
*   Finalize a build record (`recordBuildComplete`) with a `token` and `OIL receipt IDs`.
*   Conditionally return a `409 Conflict` response if `canMarkBuildDone` fails when the system health is `RED` during a build completion attempt.

The core gap is the absence of an Express route handler that orchestrates these internal service calls and applies the specified health-based logic.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves extending the existing `routes/lifeos-council-builder-routes.js` to include a `POST /build` endpoint. This endpoint will differentiate between `start` and `complete` actions based on a `type` field in the request body. It will delegate to an internal `builderControlPlaneService` (or similar) for the core logic and apply the `canMarkBuildDone` check.

### 3. Exact Safe-Scope Files to Touch First

1.  `routes/lifeos-council-builder-routes.js`: Add or modify the Express router to include the `POST /build` endpoint.
2.  `services/builderControlPlaneService.js`: Implement or extend this service to expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. This service will encapsulate the business logic and interaction with underlying data stores or health checks.
3.  `utils/systemHealth.js` (or similar): If `canMarkBuildDone` relies on a separate system health utility, ensure it provides a function to retrieve the current health status (e.g., `getSystemHealth()`).

### 4. Verifier/Runtime Checks

To verify the implementation, the following runtime checks should be performed:

*   **Build Start Success:**
    *   **Action:** Send `POST /build` to `routes/lifeos-council-builder-routes.js` with a JSON body:
        ```json
        {
          "type": "start",
          "task_id": "t-123",
          "blueprint_id": "bp-456",
          "model_used": "gemini-flash-v1"
        }
        ```
    *   **Expected Outcome:** HTTP `200 OK` or `202 Accepted`. Verify that `builderControlPlaneService.recordBuildStart` was called with the correct parameters.
*   **Build Complete Success:**
    *   **Precondition:** Ensure system health is `GREEN` (or `canMarkBuildDone` would succeed).
    *   **Action:** Send `POST /build` to `routes/lifeos-council-builder-routes.js` with a JSON body:
        ```json
        {
          "type