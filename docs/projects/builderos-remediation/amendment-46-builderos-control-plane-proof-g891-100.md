<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G891-100 -->

# Amendment 46: BuilderOS Control Plane Proof - G891-100

## Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This document outlines the necessary steps and considerations for wiring the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as per Amendment 46. This serves as a proof-closing note for the specified signal, ready for the next C2 build pass.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated `POST /build/start` and `POST /build/complete` endpoints within `routes/lifeos-council-builder-routes.js`. These endpoints are required to:
- Initiate a build record with `task_id`, `blueprint_id`, and `model_used`.
- Finalize a build record with a completion token and OIL receipt IDs.
- Incorporate a health check (`canMarkBuildDone`) before marking a build complete, returning a 409 conflict if the system health is RED.

The internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` (including its dependency on system health status) are also missing or not integrated into the routing layer.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **Route Definition:** Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`.
    -   `/build/start`
    -   `/build/complete`
2.  **Handler Logic for `/build/start`:**
    -   Extract `task_id`, `blueprint_id`, `model_used` from the request body.
    -   Call an internal `builderService.recordBuildStart({ task_id, blueprint_id, model_used })`.
    -   Return a 202 Accepted or 200 OK on success.
3.  **Handler Logic for `/build/complete`:**
    -   Extract `token` and `oil_receipt_ids` from the request body.
    -   Call an internal `builderService.canMarkBuildDone()` to check system health.
    -   If `canMarkBuildDone()` returns `false` (indicating RED health), return a 409 Conflict.
    -   If `canMarkBuildDone()` returns `true`, call `builderService.recordBuildComplete({ token, oil_receipt_ids })`.
    -   Return a 202 Accepted or 200 OK on success.
4.  **Internal Service Implementation:** Create or extend `services/builder-control-plane.js` (or similar) to include:
    -   `async recordBuildStart({ task_id, blueprint_id, model_used })`: Persists build start data.
    -   `async recordBuildComplete({ token, oil_receipt_ids })`: Persists build completion data.
    -   `async canMarkBuildDone()`: Checks system health (e.g., `healthService.getSystemHealthStatus()`) and returns `true` if not RED, `false` otherwise.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their respective handler functions.
-   `services/builder-control-plane.js` (or a new file like `services/builder-health.js`): Implement the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. This file will likely depend on a `healthService` for `canMarkBuildDone`.
-   `services/health-service.js` (if `getSystemHealthStatus` doesn't exist): Implement or extend to provide a `getSystemHealthStatus()` function that returns the current system health (e.g., 'GREEN', 'YELLOW', 'RED').

### 4. Verifier/Runtime Checks

-   **`POST /build/start`:**
    -   Send a `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, `model_used`.
    -   Verify the response status is 200 OK or 202 Accepted.
    -   Verify that a new build record is created in the underlying data store with the provided details and a 'started' status.
-   **`POST /build/complete` (Green Health):**
    -   Ensure system health is GREEN (or not RED).
    -   Send a `POST` request to `/build/complete` with valid `token` and `oil_receipt_ids`.
    -   Verify the response status is 200 OK or 202 Accepted.
    -   Verify the corresponding build record in the data store is updated to 'completed' status with the provided token and receipt IDs.
-   **`POST /build/complete` (