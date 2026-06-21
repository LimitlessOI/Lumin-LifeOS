<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G225 100. -->

Amendment 46 BuilderOS Control Plane Proof - G225-100
This document serves as a proof-closing note for Amendment 46, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js` as per the signal requiring follow-through.

1. Exact Missing Implementation or Proof Gap
The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints and associated logic to manage the BuilderOS build lifecycle. Specifically:
- A `POST /build/start` endpoint is missing, which should internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
- A `POST /build/complete` endpoint is missing, which should internally call `recordBuildComplete` with a `token` and `OIL receipt IDs`. This endpoint also requires a conditional check using `canMarkBuildDone`. If `canMarkBuildDone` returns `false` (indicating health RED), the endpoint must return a `409 Conflict` status.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves adding the two specified POST routes to `routes/lifeos-council-builder-routes.js`. This includes:
- Defining the route paths.
- Implementing request body parsing for `task_id`, `blueprint_id`, `model_used` for `/build/start` and `token`, `oil_receipt_ids`