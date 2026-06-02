# Amendment 46: BuilderOS Control Plane Proof - G806-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane integration, addressing the OIL verifier rejection due to incorrect file type. The previous attempt mistakenly placed JavaScript implementation code within this markdown proof file.

## Proof-Closing Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The core gap is the absence of the BuilderOS control plane wiring within `routes/lifeos-council-builder-routes.js`. Specifically, the `POST /build/start` and `POST /build/complete` endpoints are not implemented to interact with `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` from `builder-control-plane-service.js`.

**2. Smallest Safe Build Slice to Close It:**
Implement the two specified POST routes (`/build/start`, `/build/complete`) in `routes/lifeos-council-builder-routes.js`. This involves:
*   Importing `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` from `../services/builder-control-plane-service.js`.
*   Defining a `POST /build/start` route that calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
*   Defining a `POST /build/complete` route that first checks `canMarkBuildDone`. If `canMarkBuildDone` fails (health RED), return `409 Conflict`. Otherwise, call `recordBuildComplete` with `token` and `OIL receipt IDs`.

**3. Exact Safe-Scope Files to Touch First:**
*   `routes/lifeos-council-builder-routes.js` (primary implementation target)
*   `services/builder-control-plane-service.js` (ensure required functions are exported and functional, if not already)

**4. Verifier/Runtime Checks:**
*   **Verifier Check:** Successful static analysis and deployment of `routes/lifeos-council-builder-routes.js` without syntax or import resolution errors.
*   **Runtime Check (Start):**
    *   `POST /build/start` with valid payload returns `200 OK`.
    *   Verify `recordBuildStart` successfully logs/persists the build start event with correct `task_id`, `blueprint_id`, `model_used`.
*   **Runtime Check (Complete):**
    *   `POST /build/complete` with valid payload (and `canMarkBuildDone` healthy) returns `200 OK`.
    *   Verify `recordBuildComplete` successfully logs/persists the build completion event with correct `token` and `OIL receipt IDs`.
    *   Simulate `canMarkBuildDone` returning a "RED" health state; `POST /build/complete` must return `409 Conflict`.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   Any `POST /build` endpoint returns an unexpected HTTP status code (e.g., `500 Internal Server Error`).
*   Build lifecycle events are not accurately recorded by the service functions.
*   The `409 Conflict` response for `canMarkBuildDone` failure is not reliably triggered.
*   Any observed impact on LifeOS user features or TSOS customer-facing surfaces, indicating a scope breach.