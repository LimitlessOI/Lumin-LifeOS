Amendment 46 BuilderOS Control Plane Proof: G475-100 - Build Lifecycle Wiring

This document outlines the proof-closing steps for wiring the BuilderOS build lifecycle events (`/build` start and `/build` complete) into `routes/lifeos-council-builder-routes.js`, including health-based conditional completion.

### 1. Exact missing implementation or proof gap

The `routes/lifeos-council-builder-routes.js` currently lacks dedicated endpoints and associated internal service calls to manage the BuilderOS build lifecycle. Specifically, the following are missing:
-   A `POST /build/start` endpoint to receive `task_id`, `blueprint_id`, and `model_used` and invoke an internal `recordBuildStart` function.
-   A `POST /build/complete` endpoint to receive a `token` and `OIL receipt IDs` and invoke an internal `recordBuildComplete` function.
-   Within the `POST /build/complete` flow, a check using an internal `canMarkBuildDone` function. If `canMarkBuildDone` returns `false` (indicating health RED), the endpoint must return a `409 Conflict` status.

### 2. Smallest safe build slice to close it

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to:
-   Define a new `POST` route for `/build/start`.
-   Define a new `POST` route for `/build/complete`.
-   Implement the request body parsing for `task_id`, `blueprint_id`, `model_used` for `/build/start`.
-   Implement the request body parsing for `token` and `OIL receipt IDs` for `/build/complete`.
-   Call the internal `recordBuildStart` function with the extracted parameters.
-   Call the internal `canMarkBuildDone` function before `recordBuildComplete` in the `/build/complete` handler.
-   Conditionally return `409 Conflict` if `canMarkBuildDone` indicates health is RED.
-   Call the internal `recordBuildComplete` function with the extracted parameters.

### 3. Exact safe-scope files to touch first

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their respective handlers.
-   `services/builder-lifecycle-service.js` (or similar existing service file): If `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not yet defined, they would be added here. For the immediate route wiring, we assume these functions are either stubbed or will be implemented in a dedicated service layer. The route handler will import and call them.

### 4. Verifier/runtime checks

**Unit/Integration Tests:**
-   **`POST /build/start`:**
    -   Verify a 200 OK response when valid `task_id`, `blueprint_id`, and `model_used` are provided.
    -   Assert that `builderLifecycleService.recordBuildStart` is called with the correct arguments.
-   **`POST /build/complete`:**
    -   Verify a 200 OK response when valid `token` and `oil_receipt_ids` are provided and `builderLifecycleService.canMarkBuildDone` returns `true`.
    -   Assert that `builderLifecycleService.recordBuildComplete` is called with the correct arguments.
    -   Verify a 409 Conflict response when valid `token` and `oil_receipt_ids` are provided but `builderLifecycleService.canMarkBuildDone` returns `false` (health RED).
    -   Assert that `builderLifecycleService.recordBuildComplete` is *not* called when `canMarkBuildDone` returns `false`.

**Runtime Monitoring:**
-   Monitor application logs for successful invocations of `recordBuildStart` and `recordBuildComplete` after build events.
-   Observe HTTP response codes for `/build/start` and `/build/complete` endpoints in production.
-   Verify that BuilderOS control plane state transitions (e.g., build in progress, build completed) align with the calls to these endpoints.

### 5. Stop conditions if runtime truth disagrees

-   If `recordBuildStart` or `recordBuildComplete` are not consistently invoked or fail to update the BuilderOS state as expected.
-   If `POST /build/complete` returns a 200 OK response when the system health is demonstrably RED (i.e., `canMarkBuildDone` logic is bypassed or incorrect).
-   If `POST /build/complete` returns a 409 Conflict response when the system health is GREEN/YELLOW and a build should be allowed to complete.
-   If the BuilderOS loop experiences unexpected stalls or incorrect state reporting due to these lifecycle events not being correctly processed.