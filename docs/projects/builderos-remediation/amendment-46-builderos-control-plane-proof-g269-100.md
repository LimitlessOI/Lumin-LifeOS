# Amendment 46 BuilderOS Control Plane Proof - G269-100

This document closes the proof gap for Amendment 46, specifically addressing the wiring of BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file requires the addition of two new `POST` endpoints to manage the BuilderOS build lifecycle:
-   A `POST /build/start` endpoint to record the initiation of a build. This endpoint must accept `task_id`, `blueprint_id`, and `model_used` in its request body.
-   A `POST /build/complete` endpoint to record the completion of a build. This endpoint must accept a `token` and `oil_receipt_ids` in its request body.
-   Crucially, the `POST /build/complete` endpoint must integrate a health check using an internal `canMarkBuildDone()` function. If `canMarkBuildDone()` indicates a RED health state (e.g., returns `false`), the endpoint must return a `409 Conflict` status without proceeding to mark the build complete.

The internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are assumed to be available for import or defined within the builder context.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding a new `router.post('/build/start', ...)` handler to `routes/lifeos-council-builder-routes.js`. This handler will extract `task_id`, `blueprint_id