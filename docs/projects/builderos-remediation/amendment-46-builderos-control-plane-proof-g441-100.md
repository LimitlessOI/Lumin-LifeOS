# Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane (G441-100)

This note addresses the implementation gap for wiring BuilderOS control plane signals within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of dedicated `POST` endpoints within `routes/lifeos-council-builder-routes.js` to capture BuilderOS build lifecycle events (`/build` start and `/build` complete) and enforce health-based completion constraints. Specifically:
-   A `POST /build/start` endpoint to invoke `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
-   A `POST /build/complete` endpoint to invoke `recordBuildComplete` with a build token and OIL receipt IDs.
-   Integration of `canMarkBuildDone` health check before `recordBuildComplete`, returning a `409 Conflict` if the system health is `RED`.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new `POST` routes and their respective handlers to `routes/lifeos-council-builder-routes.js`. This slice is isolated to the BuilderOS control plane and does not impact LifeOS user features or TSOS customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`

### 4. Verifier/Runtime Checks

1.  **Build Start Endpoint Verification:**