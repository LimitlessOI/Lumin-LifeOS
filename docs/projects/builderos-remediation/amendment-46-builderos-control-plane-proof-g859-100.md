# Amendment 46: BuilderOS Control Plane Proof - G859-100

## Proof-Closing Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This document outlines the necessary steps to close the proof gap for wiring the BuilderOS control plane routes as specified in Amendment 46. The focus is on implementing the `/build` start and complete endpoints within `routes/lifeos-council-builder-routes.js`, including internal service calls and health-based conditional responses.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a build operation (start and complete). Specifically, the following are missing:
-   A `POST /build/start` endpoint to initiate build recording.
-   A `POST /build/complete` endpoint to finalize build recording and handle post-build operations.
-   The integration of internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) with these routes.
-   The conditional 409 response based on the `canMarkBuildDone` health check.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **Route Definition:** Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`.
2.  **Controller Logic:** Implementing the request handling for these routes, including input validation and calling appropriate service layer functions.
3.  **Service Layer Functions:** Defining or extending a BuilderOS-specific service (e.g., `builderControlPlaneService`) to encapsulate `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` logic.
4.  **Error Handling:** Implementing the 409 conflict response when `canMarkBuildDone` indicates a RED health state.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: To define the new API endpoints.
-   `services/builder-control-plane-service.js` (or similar existing builder service): To implement `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If this file does not exist, create it following existing service layer patterns.
-   `controllers/builder-control-plane-controller.js` (or similar existing builder controller): To house the route handler logic, orchestrating calls to the service layer. If this file does not exist, create it.

### 4. Verifier/Runtime Checks

To ensure correct implementation and functionality:

-   **Unit Tests:**
    -   Verify `builderControlPlaneService.recordBuildStart` correctly processes `task_id`, `blueprint_id`, `model_used`.
    -   Verify `builderControlPlaneService.recordBuildComplete` correctly processes `token` and `OIL receipt IDs`.
    -   Verify `builderControlPlaneService.canMarkBuildDone` returns `true` when health is GREEN and `false` when health is RED.
-   **Integration Tests (API Endpoints):**
    -   `POST /build/start` with valid `{ task_id, blueprint_id, model_used }` payload returns `200 OK` or `202 Accepted` and triggers `recordBuildStart`.
    -   `POST /build/complete` with valid `{ token, oil_receipt_ids }` payload returns `200 OK` or `202 Accepted` and triggers `recordBuildComplete` when `canMarkBuildDone` is `true`.
    -   `POST /build/complete` with valid `{ token, oil_receipt_ids }` payload returns `409 Conflict` when `canMarkBuildDone` is `false` (health RED).
    -   Verify appropriate logging for all operations.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass should halt and require re-evaluation if any of the following conditions are met during verification:

-   **API Endpoint Mismatch:** The `/build/start` or `/build/complete` endpoints are not accessible, return incorrect HTTP status codes for valid inputs, or do not accept the specified payload structures.
-   **Service Call Failure:** The internal `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` functions are not invoked by the controller, or they throw unhandled exceptions.
-   **Data Inconsistency:** Build records are not created or updated correctly in the underlying data store after successful API calls.
-   **Health Check Misbehavior:** The `POST /build/complete` endpoint returns `200 OK` when `canMarkBuildDone` indicates a RED health state, or returns `409 Conflict` when health is GREEN.
-   **Security/Authorization Bypass:** The internal nature of these routes is compromised, allowing unauthorized access or manipulation.