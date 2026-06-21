<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G1067 100. -->

The instruction specifies writing a markdown file, but the OIL verifier rejected the previous attempt by trying to execute the .md file as JavaScript, indicating a contradiction in expected file type.
Amendment 46 BuilderOS Control Plane Proof - G1067-100

This document serves as a proof-closing blueprint note for Amendment 46, focusing on the BuilderOS Control Plane. It addresses the signal requiring follow-through: wiring `routes/lifeos-council-builder-routes.js` for build lifecycle management.

**1. Exact Missing Implementation or Proof Gap:**
The core gap is the absence of the specified build lifecycle event handlers within `routes/lifeos-council-builder-routes.js`. Specifically:
- A `POST` endpoint for `/build/start` (or similar, triggered by `/build` start) to call `recordBuildStart({ task_id, blueprint_id, model_used })`.
- A `POST` endpoint for `/build/complete` (or similar, triggered by `/build` complete) to call `recordBuildComplete` with `token` and `OIL receipt IDs`.
- Logic to check `canMarkBuildDone` when health is RED and return a `409` conflict if it fails, specifically for the build completion flow.

**2. Smallest Safe Build Slice to Close It:**
Implement the new routes and their respective handler functions in `routes/lifeos-council-builder-routes.js`. These handlers will interact with an internal build service (e.g., `services/build-lifecycle-service.js`) that encapsulates `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.

**3. Exact Safe-Scope Files to Touch First:**
- `routes/lifeos-council-builder-routes.js`: Add new POST routes and their handlers.
- `services/build-lifecycle-service.js` (new or existing): Implement/expose `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`.
- `utils/health-check.js` (existing): Ensure `canMarkBuildDone` can query health status.

**4. Verifier/Runtime Checks:**