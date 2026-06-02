Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane (G103-100)

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46. The goal is to enable robust build lifecycle management, including start, completion, and health-based conflict resolution.

1.  Exact Missing Implementation or Proof Gap
    The primary gap is the absence of dedicated route handlers within `routes/lifeos-council-builder-routes.js` to:
    *   Record the start of a build process via a `POST` request to `/build/start`.
    *   Record the completion of a build process via a `POST` request to `/build/complete`.
    *   Implement a health check mechanism (`canMarkBuildDone`) to prevent build completion when the system health is `RED`, returning a `409 Conflict` status.
    These functionalities are critical for the BuilderOS control plane to accurately track and manage build lifecycles and ensure system stability during critical operations.

2.  Smallest Safe Build Slice to Close It
    The smallest safe build slice involves:
    *   Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
    *   Implementing `recordBuildStart` and `recordBuildComplete` functions, likely within a new or existing BuilderOS service layer (e.g., `services/builder-control-service.js`).
    *   Implementing `canMarkBuildDone` function, also likely within the BuilderOS service layer, which checks system health.
    *   Integrating these service functions into the route handlers.

3.  Exact Safe-Scope Files to Touch First
    1.  `routes/lifeos-council-builder-routes.js`: Add new `POST` routes for `/build/start` and `/build/complete`.
    2.  `services/builder-control-service.js`: Implement `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. Create this file if it does not exist, following existing service layer patterns.
    3.  `utils/health-check.js` (or similar): If `canMarkBuildDone` requires a dedicated health status utility, this file would be created or extended.

4.  Verifier/Runtime Checks
    *   **Unit Tests:**
        *   `services/builder-control-service.test.js`: Verify `recordBuildStart` correctly persists build start data.
        *   `services/builder-control-service.test.js`: Verify `recordBuildComplete` correctly persists build completion data and handles token/receipt IDs.
        *   `services/builder-control-service.test.js`: Verify `canMarkBuildDone` returns `true` when health is `GREEN` and `false` when `RED`.
    *   **Integration Tests:**
        *   `routes/lifeos-council-builder-routes.test.js`: Test `POST /build/start` endpoint returns 200/201 and calls `recordBuildStart`.
        *   `routes/lifeos-council-builder-routes.test.js`: Test `POST /build/complete` endpoint returns 200/201 and calls `recordBuildComplete`.
        *   `routes/lifeos-council-builder-routes.test.js`: Test `POST /build/complete` returns 409 when `canMarkBuildDone` indicates `RED` health.
    *   **Manual/E2E Verification:**
        *   Execute `POST /build/start` with valid payload and confirm build record creation in the database.
        *   Execute `POST /build/complete` with valid token and receipt IDs and confirm build record update in the database.
        *   Manually set system health to `RED` (if possible via dev tools) and attempt `POST /build/complete`, verifying a 409 response.

5.  Stop Conditions if Runtime Truth Disagrees
    *   If `POST /build/start` or `POST /build/complete` routes are not accessible or return unexpected HTTP status codes (e.g., 500 instead of 200/201/409).
    *   If build start/completion records are not accurately persisted or updated in the database after successful API calls.
    *   If `POST /build/complete` does not consistently return a 409 Conflict when the system health is `RED` and `canMarkBuildDone` fails.
    *   If the `recordBuildStart` or `recordBuildComplete` functions throw unhandled exceptions during execution.