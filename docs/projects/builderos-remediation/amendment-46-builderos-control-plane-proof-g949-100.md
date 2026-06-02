# Amendment 46 BuilderOS Control Plane Proof - G949-100

## Proof-Closing Blueprint Note

This note addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` to implement build start/complete recording and health-based completion gating.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of API endpoints within `routes/lifeos-council-builder-routes.js` to:
*   Receive and record a build start event, including `task_id`, `blueprint_id`, and `model_used`.
*   Receive and record a build complete event, including a token and OIL receipt IDs.
*   Enforce a health check (`canMarkBuildDone`) before marking a build complete, returning a 409 conflict status if the health check fails (system health is RED).

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
*   Creating a new controller module (e.g., `controllers/builder-control-plane-controller.js`) to house the logic for `recordBuildStart` and `recordBuildComplete`, and to integrate the `canMarkBuildDone` check.
*   Creating a new service module (e.g., `services/builder-control-plane-service.js`) to handle the actual persistence logic for build records.
*   Integrating a health utility (e.g., `utils/health-check-util.js