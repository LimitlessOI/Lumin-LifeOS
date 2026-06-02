### Proof-Closing Blueprint Note: G381-100 - BuilderOS Control Plane Wiring

This note addresses the implementation gap identified in Amendment 46 regarding the BuilderOS control plane, specifically the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`.

**1. Exact Missing Implementation or Proof Gap:**
The core gap is the absence of API endpoints and their corresponding internal logic to manage the start and completion of BuilderOS builds, including a critical pre-completion health check. Specifically:
-   A `POST /build/start` endpoint to record the initiation of a build. This endpoint requires `task_id`, `blueprint_id`, and `model_used` in its payload.
-   A `POST /build/complete` endpoint to record the successful completion of a build. This endpoint requires a `token` and `OIL receipt IDs` in its payload.
-   Integration of a `canMarkBuildDone` check, which must return a `409 Conflict` status if the system health is RED, preventing build completion via the `/build/complete` endpoint.

**2. Smallest Safe Build Slice to Close It:**
The smallest safe build slice involves:
-   Adding two new POST routes (`/build/start` and `/build/complete`) to `routes/lifeos-council-builder-routes.js`.
-   Implementing a