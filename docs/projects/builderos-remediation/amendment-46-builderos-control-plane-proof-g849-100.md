Amendment 46 BuilderOS Control Plane Proof - G849-100

Proof-Closing Blueprint Note

This document outlines the missing implementation, the smallest safe build slice, affected files, verifier/runtime checks, and stop conditions for closing the proof gap related to Amendment 46, specifically wiring the `routes/lifeos-council-builder-routes.js` for BuilderOS control plane operations.

### 1. Exact Missing Implementation or Proof Gap

The proof gap is the absence of wired routes in `routes/lifeos-council-builder-routes.js` to handle BuilderOS build lifecycle events. Specifically:
-   A `POST /build/start` endpoint to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
-   A `POST /build/complete` endpoint to trigger `recordBuildComplete` with a build token and OIL receipt IDs.
-   Conditional logic within the `/build/complete` endpoint to return a `409 Conflict` if `canMarkBuildDone` indicates a RED health status.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST routes to `routes/lifeos-council-builder-routes.js`. These routes will:
1.  Parse incoming request bodies for required parameters.
2.  Call the respective internal control plane service functions (`recordBuildStart`, `recordBuildComplete`).
3.  Implement the `canMarkBuildDone` health check before allowing `recordBuildComplete` to proceed, returning `409` if the check fails.
4.  Return appropriate HTTP status codes (e.g., 200/202 for success, 400 for bad requests, 409 for conflict).

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their associated handler logic.
-   `services/builder-control-plane-service.js` (assumed): This file is expected to contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. No direct modification is planned in this pass, assuming these functions are already implemented and exposed.
-   `utils/health-check.js` (assumed): If `canMarkBuildDone` relies on a separate health utility, this file would be the source. No direct modification is planned.

### 4. Verifier/Runtime Checks

**Verifier Checks (Static Analysis/Deployment):**
-   Successful deployment of `routes/lifeos-council-builder-routes.js` without syntax errors or module resolution issues.
-   Static analysis confirms the presence of `POST /build/start` and `POST /build/complete` routes.
-   Static analysis confirms calls to `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` within the respective route handlers.

**Runtime Checks (Functional/Integration):**
-   **Test Case 1: Build Start Success**
    -   `POST /build/start` with valid `{ task_id, blueprint_id, model_used }` returns `200 OK` or `202 Accepted`.
    -   Logs confirm `recordBuildStart` was invoked with the correct parameters.
-   **Test Case 2: Build Complete Success (Health GREEN)**
    -   Ensure `canMarkBuildDone` returns `true` (simulated or actual GREEN health).
    -   `POST /build/complete` with valid `{ token, oil_receipt_ids }` returns `200 OK` or `202 Accepted`.
    -   Logs confirm `recordBuildComplete` was invoked with the correct parameters.
-   **Test Case 3: Build Complete Failure (Health RED)**
    -   Ensure `canMarkBuildDone` returns `false` (simulated or actual RED health).
    -   `POST /build/complete` with valid `{ token, oil_receipt_ids }` returns `409 Conflict`.
    -   Logs confirm `recordBuildComplete` was *not* invoked.
-   **Test Case 4: Invalid Request Body**
    -   `POST /build/start` or `POST /build/complete` with missing/invalid parameters returns `400 Bad Request`.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be stopped and reverted if any of the following conditions are met during runtime verification:
-   The new routes (`/build/start`, `/build/complete`) are not accessible (e.g., return `404 Not Found`).
-   The internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are not found, throw unexpected errors, or are invoked with incorrect parameters.
-   The `/build/complete` endpoint returns an incorrect status code (e.g., `200 OK` instead of `409 Conflict` when `canMarkBuildDone` is RED, or vice-versa).
-   Observed performance degradation or increased error rates on the BuilderOS control plane.
-   Data integrity issues are detected in the build records after successful route calls.