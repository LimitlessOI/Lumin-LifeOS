Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane - G4-100

This note addresses the signal to wire `routes/lifeos-council-builder-routes.js` for build start and complete operations, including health-based conflict handling.

**1. Exact Missing Implementation or Proof Gap**
The primary gap is the absence of dedicated API endpoints and their corresponding handler logic within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. Specifically:
*   A `POST /build/start` endpoint to initiate a build, calling an internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
*   A `POST /build/complete` endpoint to finalize a build, calling `recordBuildComplete` with a build token and OIL receipt IDs.
*   Middleware or handler logic to check `canMarkBuildDone` and return a `409 Conflict` status if this check fails (e.g., when system health is RED) before allowing a build to be marked complete.

**2. Smallest Safe Build Slice to Close It**
The smallest safe build slice involves:
*   Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`.
*   Implementing or integrating with a `builderController` (or similar service layer) to encapsulate the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` logic.
*   Ensuring proper request body parsing for `task_id`, `blueprint_id`, `model_used`, `token`, and `OIL receipt IDs`.

**3. Exact Safe-Scope Files to Touch First**
*   `routes/lifeos-council-builder-routes.js`: To define the new `/build/start` and `/build/complete` POST routes and integrate the health check middleware.
*   `controllers/builder-council-controller.js` (or similar existing builder-related controller/service): To implement the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions, or to orchestrate calls to existing internal services that provide this functionality.

**4. Verifier/Runtime Checks**
*   **Unit Tests:** Verify that the new route handlers correctly parse inputs and call the underlying controller/service functions with the expected arguments.
*   **Integration Tests:**
    *   Send a `POST` request to `/build/start` and verify a `200 OK` (or `202 Accepted`) response and that `recordBuildStart` was invoked.
    *   Send a `POST` request to `/build/complete` with valid data and verify a `200 OK` response and that `recordBuildComplete` was invoked.
    *   Simulate a RED health state (where `canMarkBuildDone` returns `false`) and send a `POST` request to `/build/complete`; verify a `409 Conflict` response.
*   **OIL Verifier:** Ensure the updated `routes/lifeos-council-builder-routes.js` passes all static analysis and dependency checks.
*   **Manual Verification:** Observe logs for successful invocation of `recordBuildStart` and `recordBuildComplete` in a staging environment.

**5. Stop Conditions if Runtime Truth Disagrees**
*   Routes are not registered or return `404 Not Found`.
*   Incorrect HTTP status codes are returned (e.g., `200 OK` instead of `409 Conflict` when health is RED, or vice-versa).
*   `recordBuildStart` or `recordBuildComplete` functions are not invoked, or they fail to process/persist data as expected.
*   Any unintended side effects on other BuilderOS or LifeOS functionalities, indicating a breach of the "BuilderOS-only governed loop execution" or "Do not modify LifeOS user features" constraints.
*   The OIL verifier rejects the changes to `routes/lifeos-council-builder-routes.js` for reasons other than the initial `.md` file extension error.