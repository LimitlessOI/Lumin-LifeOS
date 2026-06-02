### Amendment 46: BuilderOS Control Plane Proof (G51-100) Remediation Note

This document addresses the OIL verifier rejection for `amendment-46-builderos-control-plane-proof-g51-100.md` due to incorrect file type (JS code in MD file). The remediation involves providing the correct markdown proof-closing note and outlining the required code changes for `routes/lifeos-council-builder-routes.js`.

**1. Exact Missing Implementation or Proof Gap:**
The wiring of `/build` start and complete endpoints in `routes/lifeos-council-builder-routes.js` is missing. Specifically, `POST /build/start` to call `recordBuildStart` and `POST /build/complete` to call `recordBuildComplete`, including a `canMarkBuildDone` health check.

**2. Smallest Safe Build Slice to Close It:**
Add two new POST routes to `routes/lifeos-council-builder-routes.js`:
- `POST /build/start`: Invokes `recordBuildStart({ task_id, blueprint_id, model_used })`.
- `POST /build/complete`: Invokes `recordBuildComplete({ token, oil_receipt_ids })`. Before invoking, check `canMarkBuildDone()`. If `false` (health RED), return `409 Conflict`.

**3. Exact Safe-Scope Files to Touch First:**
- `routes/lifeos-council-builder-routes.js`

**4. Verifier/Runtime Checks:**
- **Unit/Integration:**
    - `POST /build/start` successfully calls `recordBuildStart`.
    - `POST /build/complete` successfully calls `recordBuildComplete`.
    - `POST /build/complete` returns `409` when `canMarkBuildDone()` is `false`.
- **Runtime:**
    - Observe `recordBuildStart` and `recordBuildComplete` invocations in logs.
    - Monitor for `409` responses from `/build/complete` under health RED conditions.

**5. Stop Conditions if Runtime Truth Disagrees:**
- `recordBuildStart` or `recordBuildComplete` are not invoked.
- `/build/complete` does not return `409` when health is RED.
- Build process not correctly recorded in BuilderOS control plane.

This note closes the proof for G51-100. The implementation for `routes/lifeos-council-builder-routes.js` will proceed in the next C2 build pass.