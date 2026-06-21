<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G713 100. -->

Amendment 46 BuilderOS Control Plane Proof - G713-100
This document outlines the proof-closing blueprint note for the BuilderOS control plane, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js` as per Amendment 46.

1. Exact Missing Implementation or Proof Gap
The `routes/lifeos-council-builder-routes.js` file requires the following route handlers and logic for BuilderOS control plane operations:
- A `POST /build/start` endpoint to invoke `recordBuildStart({ task_id, blueprint_id, model_used })`.
- A `POST /build/complete` endpoint to invoke `recordBuildComplete` with a build token and OIL receipt IDs.
- The `POST /build/complete` endpoint must return a `409 Conflict` status if `canMarkBuildDone()` fails when the system health is `RED`.

2. Smallest Safe Build Slice to Close It
Modify `routes/lifeos-council-builder-routes.js` to:
- Import `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and a system health check utility (e.g., `getSystemHealth`) from their respective service modules (e.g., `../services/builderControlService.js`, `../lib/healthMonitor.js`).
- Implement a `POST` handler for `/build/start` that extracts `task_id`, `blueprint_id`, `model_used` from `req.body` and calls `recordBuildStart`.
- Implement a `POST` handler for `/build/complete` that extracts the build token and OIL receipt IDs from `req.body`. Before calling `recordBuildComplete`, check `getSystemHealth()` and `canMarkBuildDone()`. If health is `RED` and `canMarkBuildDone()` returns `false`, respond with `res.status(409).send('Build completion not allowed in RED health state.')`. Otherwise, proceed to call `recordBuildComplete` and respond with success.

3. Exact Safe-Scope Files to Touch First
- `routes/lifeos-council-builder-routes.js` (primary implementation file)
- `services/builderControlService.js` (ensure `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` are correctly exported and implemented, if not already)
- `lib/healthMonitor.js` (ensure `getSystemHealth` is correctly exported and implemented, if not already)

4. Verifier/Runtime Checks
- **Unit Tests:** Add tests for `routes/lifeos-council-builder-routes.js` handlers to verify:
    - `recordBuildStart` is called with correct arguments on `/build/start`.
    - `recordBuildComplete` is called with correct arguments on `/build/complete`.
    - `409 Conflict` is returned