Amendment 46: BuilderOS Control Plane Proof - G1005-100
Proof-Closing Blueprint Note

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file lacks the necessary POST endpoints for `/build/start` and `/build/complete`. Specifically:
    *   A `POST /build/start` endpoint to invoke `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   A `POST /build/complete` endpoint to invoke `recordBuildComplete` with `token` and `OIL receipt IDs`.
    *   The `/build/complete` endpoint must check `canMarkBuildDone()` and return a `409 Conflict` if it fails (e.g., when health is RED).

2.  **Smallest Safe Build Slice to Close It**
    Introduce two new POST route handlers within `routes/lifeos-council-builder-routes.js`. These handlers will import and utilize existing `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions from their respective service layers. The implementation will focus solely on route definition, request parsing, and function invocation, ensuring no modification to core LifeOS user features or TSOS customer-facing surfaces.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js` (for route definition and handler logic).
    *   (Implicit) Relevant service files containing `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` for import, though these files themselves are not modified in this slice.

4.  **Verifier/Runtime Checks**
    *   **Unit/Integration Tests:**
        *   Verify `POST /build/start` successfully calls `recordBuildStart` with correct `task_id`, `blueprint_id`, and `model_used`.
        *   Verify `POST /build/complete` successfully calls `recordBuildComplete` with correct `token` and `OIL receipt IDs` when `canMarkBuildDone` passes.
        *   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` fails (e.g., mocked health RED state).
        *   Verify `POST /build/complete` returns `200 OK` (or appropriate success code) when `canMarkBuildDone` passes.
    *   **Manual/E2E Checks (BuilderOS context):**
        *   Initiate a build process and observe logs/metrics for `recordBuildStart` invocation.
        *   Complete a build process and observe logs/metrics for `recordBuildComplete` invocation.
        *   Simulate a RED health state for BuilderOS and attempt to complete a build; confirm a `409` response.
        *   Confirm no regressions in existing BuilderOS control plane functionalities.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected server errors (e.g., 500).
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked with the expected parameters, or if their underlying operations fail.
    *   If the `409 Conflict` response for `canMarkBuildDone` failure is not consistently observed or is triggered incorrectly.
    *   If any existing routes or functionalities within `routes/lifeos-council-builder-routes.js` exhibit new failures or altered behavior.
    *   If the implementation introduces any dependencies or side effects outside the BuilderOS control plane.