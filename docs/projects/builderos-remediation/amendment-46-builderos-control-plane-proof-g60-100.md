# Amendment 46: BuilderOS Control Plane Proof - G60-100 Remediation

## Proof-Closing Blueprint Note

This document addresses the required follow-through for Amendment 46, specifically the wiring of BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of specific POST route handlers in `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build process. Specifically:
- A `POST /build/start` endpoint to initiate a build, calling an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used`.
- A `POST /build/complete` endpoint to finalize a build, calling an internal `recordBuildComplete` function with a build token and OIL receipt IDs.
- The `/build/complete` endpoint must also incorporate a check using `canMarkBuildDone` and return a `409 Conflict` status if this check fails when the system health is RED.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new POST route definitions to `routes/lifeos-council-builder-routes.js`.
2.  Implementing the corresponding handler functions for these routes.
3.  Ensuring the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` internal functions are correctly imported and invoked within these handlers.
4.  Handling request body parsing for `task_id`, `blueprint_id`, `model_used`, build token, and OIL receipt IDs.
5.  Implementing the conditional `409 Conflict` response based on `canMarkBuildDone` and system health status.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their respective handler logic.
-   `services/builder-control-plane-service.js` (or similar existing service): This is the assumed location for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If these functions do not exist, they will need to be added here following existing service patterns.

### 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   Verify `POST /build/start` handler correctly calls `recordBuildStart` with expected payload.
    -   Verify `POST /build/complete` handler correctly calls `recordBuildComplete` with expected payload.
    -   Verify `POST /build/complete` handler returns `409 Conflict` when `canMarkBuildDone` fails (e.g., health RED).
    -   Verify `POST /build/complete` handler returns `200 OK` when `canMarkBuildDone` succeeds.
-   **Integration Tests:**
    -   Send `POST /build/start` requests and confirm successful response (e.g., 200 OK) and internal state updates (e.g., database entry for build start).
    -   Send `POST /build/complete` requests with valid tokens/receipts and confirm successful response and internal state updates.
    -   Simulate a RED health state and send `POST /build/complete` to confirm a `409 Conflict` response.
-   **Logging:** Monitor application logs to confirm `recordBuildStart` and `recordBuildComplete` actions are logged as expected.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` or `POST /build/complete` endpoints are unreachable or return unexpected HTTP status codes (e.g., 404, 500).
-   If `recordBuildStart` or `recordBuildComplete` are not invoked or are invoked with incorrect parameters.
-   If the `409 Conflict` response is not consistently returned when `canMarkBuildDone` indicates a failure condition (e.g., health RED).
-   If the internal state (e.g., build records in the database) does not reflect the start and completion events as expected.
-   If the required internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) cannot be resolved or imported from the assumed service layer.