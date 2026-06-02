### Amendment 46 BuilderOS Control Plane Proof - G337-100 Remediation

This document outlines the remediation plan and proof for closing the identified gaps in Amendment 46, specifically concerning the BuilderOS control plane integration within `routes/lifeos-council-builder-routes.js`.

#### 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the BuilderOS control plane within `routes/lifeos-council-builder-routes.js` to correctly manage build lifecycle events and enforce health checks.

Specifically, the `routes/lifeos-council-builder-routes.js` file requires:
*   **Build Start Endpoint Integration:** The `POST /build` endpoint needs to be extended to internally call `builderControlPlaneService.recordBuildStart({ task_id, blueprint_id, model_used })` upon initiation of a build. This ensures proper tracking of build attempts.
*   **Build Complete Endpoint Integration:** A dedicated endpoint (e.g., `POST /build/complete`) is required to accept build completion data (token, OIL receipt IDs) and internally call `builderControlPlaneService.recordBuildComplete(token, oilReceiptIds)`.
*   **Health-Based Completion Guard:** Within the build completion logic, a check against `builderControlPlaneService.canMarkBuildDone()` must be performed. If this function returns `false` (indicating a RED health status), the completion attempt must be rejected with an HTTP `409 Conflict` status code.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to:
1.  Import necessary builder control plane service functions (e.g., `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).
2.  Update the existing `POST /build` route handler to include the `recordBuildStart` call.
3.  Add a new `POST /build/complete` route handler (or extend an existing completion mechanism) to:
    *   Extract `token` and `oilReceiptIds` from the request body.
    *   Call `canMarkBuildDone()`.
    *   If `false`, return `409 Conflict`.
    *   If `true`, call `recordBuildComplete(token, oilReceiptIds)` and return a success status (e.g., `200 OK` or `204 No Content`).

This slice focuses solely on the specified route file and its direct interaction with the assumed `builderControlPlaneService`, avoiding any changes to LifeOS user features or TSOS customer-facing surfaces.

#### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This is the primary file for implementing the route handlers and integrating the build lifecycle functions.

*(Assumption: `builderControlPlaneService` is an existing module that exports `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If not, these service functions would be implemented in a separate, subsequent task within an approved service layer file, e.g., `services/builder-control-plane.js`.)*

#### 4. Verifier/Runtime Checks

*   **Unit Tests (on `routes/lifeos-council-builder-routes.js`):**
    *   Verify `POST /build` calls `builderControlPlaneService.recordBuildStart` with `task_id`, `blueprint_id`, and `model_used` from the request body.
    *   Verify `POST /build/complete` calls `builderControlPlaneService.recordBuildComplete` with the provided `token` and `oilReceiptIds`.
    *   Verify `POST /build/complete` returns `409 Conflict` when `builderControlPlaneService.canMarkBuildDone()` returns `false`.
    *   Verify `POST /build/complete` returns `200 OK` (or `204 No Content`) when `builderControlPlaneService.canMarkBuildDone()` returns `true` and `recordBuildComplete` is successfully invoked.
*   **Integration Tests:**
    *   Deploy a test build process that triggers `POST /build`, then attempts `POST /build/complete` under both healthy (simulated `canMarkBuildDone` returning `true`) and unhealthy (simulated `canMarkBuildDone` returning `false`) conditions.
    *   Monitor internal logs/metrics for successful `recordBuildStart` and `recordBuildComplete` invocations.
    *   Observe HTTP response codes for build completion attempts to confirm `409` for unhealthy states and `2xx` for healthy states.
*   **Manual Verification:**
    *   Trigger a build via the BuilderOS interface and confirm `recordBuildStart` is logged.
    *   Manually simulate an unhealthy system state (if possible, e.g., by mocking `canMarkBuildDone` in a test environment).
    *   Attempt to complete a build and observe the `409 Conflict` response.
    *   Restore a healthy state, complete a build, and observe a successful `2xx` response.

#### 5. Stop Conditions if Runtime Truth Disagrees

*   **`recordBuildStart` not invoked:** If logs or metrics indicate `builderControlPlaneService.recordBuildStart` is not called on `POST /build` initiation, or is called with incorrect parameters.
*   **`recordBuildComplete` not invoked:** If logs or metrics indicate `builderControlPlaneService.recordBuildComplete` is not called on build completion, or is called with incorrect parameters (missing token, OIL receipt IDs).
*   **Incorrect `409` behavior:** If `POST /build/complete` does not return `409 Conflict` when `builderControlPlaneService.canMarkBuildDone()` is `false`, or returns `409 Conflict` when `canMarkBuildDone()` is `true`.
*   **Unintended side effects:** Any observed changes to LifeOS user features or TSOS customer-facing surfaces, indicating a scope violation.
*   **Service instability:** Increased error rates or latency specifically within the `lifeos-council-builder-routes` module.