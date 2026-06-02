The verifier rejected the .md file as an unknown executable, contradicting the task to write a .md document.
Amendment 46 BuilderOS Control Plane Proof (G748-100)
This document outlines the next C2 build pass for wiring the BuilderOS control plane routes as specified in Amendment 46.

1. Exact Missing Implementation or Proof Gap
The `routes/lifeos-council-builder-routes.js` module requires new endpoints and associated logic to manage the BuilderOS control plane. Specifically:
- A `POST /build/start` endpoint to internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
- A `POST /build/complete` endpoint to internally call `recordBuildComplete` with `token` and `OIL receipt IDs`.
- The `/build/complete` endpoint must return a `409 Conflict` status if `canMarkBuildDone` fails when the system health is `RED`.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves adding two new POST routes within `routes/lifeos-council-builder-routes.js`. These routes will:
- Extract necessary parameters from the request body.
- Call the respective internal service functions (`recordBuildStart`, `recordBuildComplete`).
- For `/build/