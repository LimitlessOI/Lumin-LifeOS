<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G145 100. -->

Amendment 46 BuilderOS Control Plane Proof - G145-100: Builder Route Wiring
This document serves as a proof-closing blueprint note for `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, specifically addressing the signal to wire `routes/lifeos-council-builder-routes.js`.
---
1. Exact Missing Implementation or Proof Gap:
The `routes/lifeos-council-builder-routes.js` module currently lacks the necessary POST endpoints and associated internal logic to fully integrate with the BuilderOS control plane's build lifecycle management. The specific gaps are:
-   `POST /build/start` Endpoint: An endpoint is missing to signal the initiation of a build. This endpoint must accept `task_id`, `blueprint_id`, and `model_used` in its request body and internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   `POST /build/complete` Endpoint: An endpoint is missing to signal the completion of a build. This endpoint must accept a `token` and `receipt_ids` (representing OIL receipt IDs) in its request body and internally call `recordBuildComplete