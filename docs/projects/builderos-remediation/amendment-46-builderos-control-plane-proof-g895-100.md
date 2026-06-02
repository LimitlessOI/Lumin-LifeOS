Amendment 46: BuilderOS Control Plane Proof - G895-100

Proof-Closing Blueprint Note

This note addresses the follow-through signal for Amendment 46, focusing on wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`.

1. Exact Missing Implementation or Proof Gap

The core gap is the incomplete wiring of the `/build` endpoint in `routes/lifeos-council-builder-routes.js` to correctly handle build start and completion events, and to enforce health-based build completion restrictions. Specifically:
- The `POST /build/start` endpoint needs to call an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used`.
- The `POST /build/complete` endpoint needs to call an internal `recordBuildComplete` function with a build token and OIL receipt IDs.
- The `POST /build/complete` endpoint must return a `409 Conflict` status if `canMarkBuildDone` fails when the system health is `RED`.

2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
- Adding two new POST routes: `/build/start` and `/build/complete` to `routes/lifeos-council-builder-routes.js`.
- Implementing or integrating placeholder stubs for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` within the builder control plane's internal services, ensuring they are accessible by the router.
- Adding middleware or direct logic within the `/build/complete` route handler to check `canMarkBuildDone` and return 409 if health is RED.

3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`: This file will contain the new route definitions and their handlers.
- `services/builder-control-plane-service.js` (inferred): This file (or a similar internal service) would house the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If it doesn't exist, a new internal module should be created following existing patterns. For this build slice, we assume such a service exists or will be created.

4. Verifier/Runtime Checks

- **Unit Tests:**
    - Verify `POST /build/start` correctly calls `recordBuildStart` with expected parameters.
    - Verify `POST /build/complete` correctly calls `recordBuildComplete` with expected parameters.
    - Verify `POST /build/complete` returns `200 OK` when `canMarkBuildDone` succeeds.
    - Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` fails due to `RED` health.
- **Integration Tests:**
    - Deploy the updated `lifeos-council-builder-routes.js` and associated services.
    - Use a test client to send `POST /build/start` requests and confirm internal logging/state updates.
    - Use a test client to send `POST /build/complete` requests, first with healthy state, then with simulated `RED` health, confirming appropriate responses.

5. Stop Conditions if Runtime Truth Disagrees

- If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 404, 500) during integration testing.
- If `recordBuildStart` or `recordBuildComplete` are not invoked or receive incorrect parameters as observed through internal logging/monitoring.
- If the `409 Conflict` response for `RED` health is not consistently returned when `canMarkBuildDone` fails, or if it's returned incorrectly when health is not `RED`.
- If any existing BuilderOS functionality or LifeOS user features are inadvertently impacted (e.g., existing `/build` routes, if any, are broken or modified). This would indicate a scope breach.