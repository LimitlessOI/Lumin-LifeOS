Amendment 46: BuilderOS Control Plane Proof - G41-100

Proof-Closing Blueprint Note

This note addresses the follow-through signal for wiring `routes/lifeos-council-builder-routes.js` to implement the BuilderOS control plane endpoints for build start and completion, including health-based conditional completion.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file requires new `POST` route handlers for the `/build` path to manage build lifecycle events. Specifically:
    -   A handler to record build start, invoking `recordBuildStart({ task_id, blueprint_id, model_used })`.
    -   A handler to record build completion, invoking `recordBuildComplete` with `token` and OIL receipt IDs. This handler must conditionally return a `409 Conflict` if `canMarkBuildDone()` fails when the system health is `RED`.

2.  **Smallest Safe Build Slice to Close It**
    Implement two distinct `POST` handlers within `routes/lifeos-council-builder-routes.js` for the `/build` endpoint.
    -   The "start" handler will parse `task_id`, `blueprint_id`, and `model_used` from the request body and pass them to `recordBuildStart`.
    -   The "complete" handler will parse `token` and OIL receipt IDs. Before calling `recordBuildComplete`, it will check `canMarkBuildDone()`. If `canMarkBuildDone()` returns `false` and the system health is `RED`, it will respond with `409`. Otherwise, it will proceed to call `recordBuildComplete` and respond with success.
    -   Assume `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are imported from a designated builder service module (e.g., `../services/builderService.js`).

3.  **Exact Safe-Scope Files to Touch First**
    -   `routes/lifeos-council-builder-routes.js`
    -   (Potentially) `services/builderService.js` if `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` need initial stubbing or minor adjustments to support the new route calls.

4.  **Verifier/Runtime Checks**
    -   **Unit Tests:** Verify that `routes/lifeos-council-builder-routes.js` handlers correctly:
        -   Call `recordBuildStart` with the expected payload on build start.
        -   Call `recordBuildComplete` with the expected payload on build completion.
        -   Return `409` when `canMarkBuildDone()` fails and health is `RED` for build completion.
        -   Return `2xx` when `canMarkBuildDone()` passes or health is not `RED` for build completion.
    -   **Integration Tests:** Deploy to a test environment and confirm:
        -   Successful build start requests trigger `recordBuildStart` logic.
        -   Successful build completion requests trigger `recordBuildComplete` logic.
        -   Build completion requests under simulated `RED` health and `canMarkBuildDone()` failure result in `409` responses.

5.  **Stop Conditions if Runtime Truth Disagrees**
    -   If `recordBuildStart` or `recordBuildComplete` are not invoked or receive incorrect parameters.
    -   If the `/build` completion endpoint does not consistently return `409` under the specified `RED` health and `canMarkBuildDone()` failure conditions.
    -   If the application fails to start or existing BuilderOS control plane functionality is disrupted.