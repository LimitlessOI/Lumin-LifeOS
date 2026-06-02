# Amendment 46 BuilderOS Control Plane Proof - G752-100

This document outlines the proof-closing blueprint note for wiring the BuilderOS control plane routes as specified in Amendment 46.

---

## Proof-Closing Blueprint Note: BuilderOS Control Plane Route Wiring

This note addresses the required implementation for `routes/lifeos-council-builder-routes.js` to support BuilderOS loop execution signals.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module currently lacks the necessary POST endpoints to handle build start and build complete signals from the BuilderOS control plane. Specifically:

*   A `POST /build/start` endpoint is missing, which should internally call `builderControlPlaneService.recordBuildStart({ task_id, blueprint_id, model_used })`.
*   A `POST /build/complete` endpoint is missing, which should internally call `builderControlPlaneService.recordBuildComplete({ token, oil_receipt_ids })`.
*   The `POST /build/complete` endpoint also requires a pre-check using `builderControlPlaneService.canMarkBuildDone()`. If this check fails while the system health is RED, the endpoint must return a `409 Conflict` status.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST routes to the existing `lifeosCouncilBuilderRouter` in `routes/lifeos-council-builder-routes.js`.

**For `/build/start`:**
*   Define a `POST` route at `/build/start`.
*   Extract `task_id`, `blueprint_id`, and `model_used` from the request body.
*   Call `builderControlPlaneService.recordBuildStart` with these parameters.
*   Respond with a `200 OK` or `202 Accepted` on successful recording.

**For `/build/complete`:**
*   Define a `POST` route at `/build/complete`.
*   First, call `builderControlPlaneService.canMarkBuildDone()`.
*   If `canMarkBuildDone()` returns `false` and the system health is determined to be RED (as managed internally by `builderControlPlaneService`), return a `409 Conflict` status.
*   If the check passes or health is not RED, extract `token` and `oil_receipt_ids` from the request body.
*   Call `builderControlPlaneService.recordBuildComplete` with these parameters.
*   Respond with a `200 OK` on successful recording.

Error handling (e.g., for missing body parameters, internal service errors) should follow existing patterns within the router.

### 3. Exact Safe-Scope Files to Touch First

1.  `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes.
2.  `services/builderControlPlaneService.js` (or equivalent): This file will need to expose (or implement if not existing) the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If these functions are not yet implemented, their stubs should be created here.

### 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   Test `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used` to ensure `recordBuildStart` is called and a `2xx` status is returned.
    *   Test `POST /build/complete` with valid `token` and `oil_receipt_ids` to ensure `recordBuildComplete` is called and a `2xx` status is returned when `canMarkBuildDone` allows.
    *   Test `POST /build/complete` when `canMarkBuildDone` returns `false` and health is RED, expecting a `409 Conflict` status.
    *   Test `POST /build/complete` when `can