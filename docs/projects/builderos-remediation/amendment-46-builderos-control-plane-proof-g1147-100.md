<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G1147 100. -->

Amendment 46: BuilderOS Control Plane Proof - G1147-100

This document serves as a proof-closing note for the initial wiring of the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`, addressing the signal requiring follow-through for build start/complete events and health-based completion checks.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the concrete implementation of the `/build/start` and `/build/complete` POST endpoints within `routes/lifeos-council-builder-routes.js`. This includes:
- Defining the route handlers.
- Integrating with the internal `recordBuildStart` function for build initiation.
- Integrating with the internal `recordBuildComplete` function for build finalization.
- Implementing the health check using `canMarkBuildDone` before allowing build completion, and returning a 409 conflict status if the health is RED.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
-   **Route Definition:** Adding two new `POST` routes: `/build/start` and `/build/complete` to the `lifeos-council-builder-routes.js` router.
-   **Start Handler Logic:** For `/build/start`, extracting `task_id`, `blueprint_id`, and `model_used` from the request body and calling `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   **Complete Handler Logic:** For `/build/complete`, extracting `token` and `oil_receipt_ids` from the request body. Before calling `recordMarkBuildDone()`, invoke `canMarkBuildDone()`. If `canMarkBuildDone()` returns false (indicating RED health), respond with a 409 status. Otherwise, proceed to call `recordBuildComplete({ token, oil_receipt_ids })`.
-   **Dependency Injection/Import:** Ensuring `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly imported or made available within the route handler scope.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will contain the new route definitions and their handler logic.
-   `services/builder-control-plane-service.js` (or similar existing service file): This file is the likely location for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` if they are not yet defined. If they exist, no modification is needed here, only import into the routes file.

### 4. Verifier/Runtime Checks

**Unit/Integration Tests:**
-   `POST /build/start` with valid `{ task_id, blueprint_id, model_used }` payload: Expect 200/202 status, and verify `recordBuildStart` was called with the correct arguments.
-   `POST /build/start` with invalid/missing payload: Expect 400 status.
-   `POST /build/complete` with valid `{ token, oil_receipt_ids }` payload when `canMarkBuildDone()` is true: Expect 200/202 status, and verify `recordBuildComplete` was called with the correct arguments.
-   `POST /build/complete` with valid `{ token, oil_receipt_ids }` payload when `canMarkBuildDone()` is false (health RED): Expect 409 status, and verify `recordBuildComplete` was *not* called.
-   `POST /build/complete` with invalid/missing payload: Expect 400 status.

**Runtime Monitoring:**
-   Observe application logs for successful invocations of `recordBuildStart` and `recordBuildComplete` following `/build/start` and `/build/complete` requests.
-   Monitor HTTP response codes for `/build/start` and `/build/complete` endpoints, specifically looking for 2xx on success, 400 on bad input, and 409 when health is RED for completion.
-   Verify that `recordBuildComplete` is not called when a 409 is returned.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` or `recordBuildComplete` are not invoked or are invoked with incorrect parameters despite valid route calls.
-   If `/build/complete` returns a 2xx status when `canMarkBuildDone()` indicates RED health.
-   If `/build/complete` returns an error other than 409 when `canMarkBuildDone()` indicates RED health.
-   If the `/build/start` or `/build/complete` routes are unreachable (e.g., 404) or consistently return server errors (e.g., 500) for valid requests.
-   If the system exhibits unexpected side effects on LifeOS user features or TSOS customer-facing surfaces, indicating a scope breach.