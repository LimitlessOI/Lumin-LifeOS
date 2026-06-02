# Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane (G103-100)

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46. The goal is to enable robust build lifecycle management, including start, completion, and health-based conflict resolution.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated route handlers within `routes/lifeos-council-builder-routes.js` to:
*   Record the start of a build process via a `POST` request to `/build/start`.
*   Record the completion of a build process via a `POST` request to `/build/complete`.
*   Implement a health check mechanism (`canMarkBuildDone`) to prevent build completion when the system health is `RED`, returning a `409 Conflict` status.

These functionalities are critical for the BuilderOS control plane to accurately track and manage build lifecycles and ensure system stability during critical operations.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
*   Implementing `recordBuildStart` and `recordBuildComplete` functions, likely within a new or existing BuilderOS service layer (e.g., `services/builder-control-service.js`).
*   Implementing `canMarkBuildDone` function, also likely within the BuilderOS service layer, which checks system health.
*   Integrating these service functions into the route handlers.

### 3. Exact Safe-Scope Files to Touch First

1.