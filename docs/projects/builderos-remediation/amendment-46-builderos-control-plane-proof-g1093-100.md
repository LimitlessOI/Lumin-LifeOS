<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G1093-100 -->

# Amendment 46: BuilderOS Control Plane Proof - G1093-100

## Proof-Closing Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This document outlines the necessary steps and verification for implementing the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js`, as specified by Amendment 46. This note addresses the required wiring for build lifecycle events and health checks.

### 1. Exact Missing Implementation or Proof Gap

The BuilderOS control plane requires specific route handlers within `routes/lifeos-council-builder-routes.js` to manage build lifecycle events. The current implementation lacks:
*   A `POST` endpoint for `/build` to initiate and complete builds.
*   Integration of `recordBuildStart({ task_id, blueprint_id, model_used })` on build start.
*   Integration of `recordBuildComplete` with `token` and `OIL receipt IDs` on build completion.
*   A conditional check using `canMarkBuildDone` to return a `409` status if the health is `RED` when attempting to mark a build as complete.

### 2. Smallest Safe Build Slice to Close It

Implement the `POST /build` route in `routes/lifeos-council-builder-routes.js` to encapsulate the following logic:
1.  **Build Start:** On initial request, call `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used` extracted from the request body.
2.  **Build Completion:** Upon receiving completion signals (e.g., via a subsequent request or a specific payload within the same request), call `recordBuildComplete` with the provided `token` and `OIL receipt IDs`.
3.  **Health Check:** Before marking a build as complete, invoke `canMarkBuildDone()`. If this function returns `false` (indicating health `RED`), immediately return an HTTP `409 Conflict` status without proceeding to `recordBuildComplete`.

This slice focuses exclusively on the route definition and the direct invocation of the specified internal functions, ensuring no modifications to LifeOS user features or TSOS customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This file is the primary target for adding the new `POST /build` route and its associated handler logic.
*   *(Implicit dependency)*: The functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are assumed to exist or be available for import from an internal BuilderOS service module (e.g., `services/builder-control-service.js`). No changes to these service functions are part of this build slice.

### 4. Verifier/Runtime Checks

*   **Unit Tests (`routes/lifeos-council-builder-routes.js`):**
    *   Verify that `recordBuildStart` is called with the correct `task_id`, `blueprint_id`, and `model_used` when a build initiation payload is received.
    *   Verify that `recordBuildComplete` is called with the correct `token` and `OIL receipt IDs` when a build completion payload is received.
    *   Verify that a `409 Conflict` status is returned when `canMarkBuildDone()` evaluates to `false` (health `RED`).
    *   Verify that `recordBuildComplete` is *not* called when `canMarkBuildDone()` evaluates to `false`.
*   **Integration Tests (API Gateway/Local Server):**
    *   Send a `POST` request to `/build` with a build initiation payload and confirm `recordBuildStart` is triggered.
    *   Send a `POST` request to `/build` with a build completion payload and confirm `recordBuildComplete` is triggered.
    *   Simulate `canMarkBuildDone()` returning `false` and confirm the `/build` endpoint responds with `409 Conflict`.
*   **Runtime Monitoring:**
    *   Monitor BuilderOS logs for successful invocation of `recordBuildStart` and `recordBuildComplete` during actual build processes.
    *   Observe HTTP response codes for `/build` endpoint under various health conditions.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `recordBuildStart` or `recordBuildComplete` are not invoked as expected, or are invoked with incorrect parameters.
*   If the `POST /build` endpoint does not return `409 Conflict` when `canMarkBuildDone()` indicates a `RED` state.
*   If `recordBuildComplete` is invoked when `canMarkBuildDone()` indicates a `RED` state.
*   If the new route handler introduces regressions in existing BuilderOS functionality or other LifeOS council routes.
*   If the implementation requires modifications outside `routes/lifeos-council-builder-routes.js` that are not explicitly approved for this build slice.