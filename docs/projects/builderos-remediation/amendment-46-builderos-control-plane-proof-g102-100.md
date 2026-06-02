Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane (G102-100)

This document outlines the implementation plan and verification steps for wiring the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js`, as specified by Amendment 46.

**1. Exact Missing Implementation / Proof Gap**
The `routes/lifeos-council-builder-routes.js` file requires the addition of two new POST endpoints and their corresponding handlers:
-   `POST /build/start`: To record the initiation of a build process. This endpoint must call an internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
-   `POST /build/complete`: To record the successful completion of a build process. This endpoint must call an internal `recordBuildComplete({ token, oil_receipt_ids })` function. Additionally, it must implement a conditional check: if the BuilderOS health is `RED` and `canMarkBuildDone(token)` returns `false`, the endpoint must return a `409 Conflict` status.

The internal functions `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and a mechanism to retrieve BuilderOS health status (e.g., `getBuilderHealthStatus`) are assumed to exist or will be implemented in a dedicated BuilderOS control plane service layer. The gap is the wiring of these functions to the HTTP routes and the implementation of the health-check-gated completion logic.

**2. Smallest Safe Build Slice to Close It**
The smallest safe build slice involves:
a.  Defining the `POST /build/start` route and its handler in `routes/lifeos-council-builder-routes.js`.
b.  Defining the `POST /build/complete` route and its handler in `routes/lifeos-council-builder-routes.js`.
c.  Importing or defining the necessary internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, `getBuilderHealthStatus`) within the scope accessible by the route handlers.
d.  Implementing the `409` conflict logic for `/build/complete` based on health status and `canMarkBuildDone` evaluation.

**3. Exact Safe-Scope Files to Touch First**
-   `routes/lifeos-council-builder-routes.js`: For adding the new route definitions and their Express.js handlers.
-   `services/builderControlPlaneService.js` (or similar existing internal service file): To implement/export `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and `getBuilderHealthStatus` if they do not already exist. This ensures separation of concerns and keeps the route file focused on HTTP handling.

**4. Verifier/Runtime Checks**
-   **Unit Tests (for `routes/lifeos-council-builder-routes.js`):**
    -   Verify `POST /build/start` calls `recordBuildStart` with `task_id`, `blueprint_id`, `model_used` from request body.
    -   Verify `POST /build/complete` calls `recordBuildComplete` with `token` and `oil_receipt_ids` from request body.
    -   Verify `POST /build/complete` returns `409` when `getBuilderHealthStatus()` is `RED` and `canMarkBuildDone()` is `false`.
    -   Verify `POST /build/complete` returns `200` when `getBuilderHealthStatus()` is `GREEN` (or `RED` but `canMarkBuildDone()` is `true`).
    -   Verify `POST /build/start` and `POST /build/complete` return `400` for missing required body parameters.
-   **Integration Tests (End-to-End):**
    -   Send a `POST` request to `/build/start` with valid parameters and assert a `202` status code and that a build start record is created in the underlying data store.
    -   Send a `POST` request to `/build/complete` with valid parameters (simulating `GREEN` health or `canMarkBuildDone` true) and assert a `200` status code and that a build complete record is created.
    -   Simulate a `RED` health state for BuilderOS and `canMarkBuildDone` returning `false`, then send a `POST` request to `/build/complete`. Assert a `409` status code and that no build complete record is created.
-   **Manual Runtime Verification:**
    -   Deploy the changes to a staging environment.
    -   Use `curl` or a similar tool to hit the `/build/start` and `/build/complete` endpoints under various health conditions (simulated or actual) and observe the HTTP responses and system logs.
    -   Monitor BuilderOS metrics to ensure build start/complete events are correctly registered.

**5. Stop Conditions if Runtime Truth Disagrees**
-   If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., `404`, `500` without expected error logging).
-   If `recordBuildStart` or `recordBuildComplete` are not invoked, or invoked with incorrect parameters, as evidenced by logs or data store state.
-   If the `409 Conflict` status is not returned for `/build/complete` when BuilderOS health is `RED` and `canMarkBuildDone` evaluates to `false`.
-   If the `200 OK` status is not returned for `/build/complete` when BuilderOS health allows completion (e.g., `GREEN` or `canMarkBuildDone` true).
-   If any existing BuilderOS control plane functionality or other LifeOS features are negatively impacted or exhibit regressions.