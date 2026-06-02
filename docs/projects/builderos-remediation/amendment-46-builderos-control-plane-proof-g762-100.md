Amendment 46 BuilderOS Control Plane Proof - G762-100

Proof-Closing Blueprint Note

This document addresses the follow-through signal for Amendment 46, specifically wiring the `routes/lifeos-council-builder-routes.js` to manage BuilderOS build lifecycle events.

1.  **Exact Missing Implementation or Proof Gap**
    The primary gap is the implementation of two new POST endpoints within `routes/lifeos-council-builder-routes.js`:
    -   A `/build/start` endpoint to initiate a build, calling an internal `recordBuildStart` service with `task_id`, `blueprint_id`, and `model_used`.
    -   A `/build/complete` endpoint to finalize a build, calling an internal `recordBuildComplete` service with a build token and OIL receipt IDs. This endpoint must also incorporate a check using `canMarkBuildDone` and return a 409 Conflict status if this check fails when the system health is RED.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves:
    -   Adding two new `router.