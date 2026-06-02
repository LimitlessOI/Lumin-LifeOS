### Proof-Closing Blueprint Note: G255-100 - BuilderOS Control Plane Wiring

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` currently lacks the necessary API endpoints and associated handler logic to manage the BuilderOS build lifecycle. Specifically, there are no `POST` routes for `/build/start` and `/build/complete`. Furthermore, the critical health check mechanism (`canMarkBuildDone`) is not integrated into the build completion flow to gate operations based on system health, nor are the internal functions `recordBuildStart` and `recordBuildComplete` exposed via the API layer.

**2. Smallest Safe Build Slice to Close It:**
This build slice focuses on establishing the API surface and initial handler calls within the BuilderOS control plane.
*   **Route Definition:** Define two new `POST` routes in `routes/lifeos-council-builder-routes.js`:
    *   `/build/start`: To initiate a build record, accepting `task_id`, `blueprint_id`, and `model_used`.
    *   `/build/complete`: To finalize a build record, accepting a `token` and `oil_receipt_ids`, and integrating a health check.
*   **Controller/Service Integration:** Create or extend a BuilderOS-specific controller (e.g., `controllers/builderControlPlaneController.js`) to encapsulate the logic for `handleBuildStart`, `handleBuildComplete`, and integrate the `canMarkBuildDone` check.
*   **Health Check Integration:** Within the `/build/complete` handler, integrate a call to `canMarkBuildDone`. If this check fails and indicates a RED health status, the endpoint must return a `409 Conflict` response.

**3. Exact Safe-Scope Files to Touch First:**
*   `routes/lifeos-council