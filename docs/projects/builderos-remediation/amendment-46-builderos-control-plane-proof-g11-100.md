Amendment 46: BuilderOS Control Plane Proof - G11-100
Proof-Closing Blueprint Note
This note addresses the implementation gap for wiring the BuilderOS control plane routes as specified in Amendment 46, focusing on build start and completion signals within `routes/lifeos-council-builder-routes.js`.
1.  Exact Missing Implementation or Proof Gap
    The primary gap is the absence of wired routes in `routes/lifeos-council-builder-routes.js` to handle BuilderOS build lifecycle events. Specifically:
-   A `POST` endpoint for `/build/start` that internally calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST` endpoint for `/build/complete` that internally calls `recordBuildComplete` with a build token and OIL receipt IDs.
-   Conditional logic within the `/build/complete` handler to check `canMarkBuildDone` and return a `409 Conflict` status if the health is `RED`.
2.  Smallest Safe Build Slice to Close It
    The smallest safe build slice involves:
-   Adding two new `POST` route definitions to `routes/lifeos-council-builder-routes.js`.
-   Implementing or importing the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions within the BuilderOS control plane service layer (e.g., `services/builder-control-plane-service.js` or similar existing internal service).
-   Ensuring these functions interact with the BuilderOS internal state and OIL system as required, without exposing or modifying LifeOS user features.
3.  Exact Safe-Scope Files to Touch First
-   `routes/lifeos-council-builder-routes.js`: To define the new `/build/start` and `/build/complete` POST endpoints.
-   `services/builder-control-plane-service.js` (or equivalent existing internal BuilderOS service file): To implement or house the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.
4.  Verifier/Runtime Checks
-   Route Accessibility: Verify that `POST /build/start` and `POST /build/complete` are accessible only to BuilderOS internal callers and return appropriate HTTP status codes (e.g., 200 OK or 202 Accepted on success).
-   `recordBuildStart` Invocation: Confirm that `recordBuildStart` is called with the correct `task_id`, `blueprint_id`, and `model_used` parameters upon a successful `/build/start` request.
-   `recordBuildComplete` Invocation: Confirm that `recordBuildComplete` is called with the correct build token and OIL receipt IDs upon a successful `/build/complete` request.
-   `canMarkBuildDone` Health Check: Test the `/build/complete` endpoint under conditions where `canMarkBuildDone` would return `RED` health. Expect a `409 Conflict` response.
-   No User Impact: Verify through integration tests that no LifeOS user-facing features or TSOS customer surfaces are affected by these changes.
5.  Stop Conditions if Runtime Truth Disagrees
-   If `POST /build/start` or `POST /build/complete` routes are not correctly registered or return unexpected HTTP status codes (e.g., 404 Not Found,