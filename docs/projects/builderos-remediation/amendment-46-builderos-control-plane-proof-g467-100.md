Amendment 46: BuilderOS Control Plane Proof (G467-100) - Proof Closing Note

This document serves as a proof-closing note for the implementation of BuilderOS control plane wiring within `routes/lifeos-council-builder-routes.js`, as specified by Amendment 46. The previous attempt failed due to the verifier attempting to execute this markdown file as code. This note clarifies the required implementation.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of the `/build` start and complete POST endpoints in `routes/lifeos-council-builder-routes.js`. These endpoints need to:
-   Receive `POST /build/start` requests with `task_id`, `blueprint_id`, and `model_used`.
-   Call an internal `recordBuildStart` function with the received payload.
-   Receive `POST /build/complete` requests with a `token` and `oil_receipt_ids`.
-   Before marking complete, check the system health via `canMarkBuildDone`.
-   If `canMarkBuildDone` indicates a RED health status, return a 409 Conflict.
-   Otherwise, call an internal `recordBuildComplete` function with the token and OIL receipt IDs.

### 2. Smallest Safe Build Slice to Close It

Implement the two new POST routes within `routes/lifeos-council-builder-routes.js` and integrate calls to the `builderControlPlaneService` (or equivalent) for build state management and health checks. This slice focuses solely on the BuilderOS control plane and does not interact with LifeOS user features or TSOS customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: Add the new POST routes and their handlers.
-   `services/builder-control-plane-service.js` (or similar): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly implemented and exposed.
-   `utils/health-check.js` (or similar): Verify the underlying health check mechanism that `canMarkBuildDone` relies upon.

### 4. Verifier/Runtime Checks

-   **Route Accessibility:**
    -   `POST /build/start` with `{ "task_id": "...", "blueprint_id": "...", "model_used": "..." }` should return a 200/202 status.
    -   `POST /build/complete` with `{ "token": "...", "oil_receipt_ids": ["...", "..."] }` should return a 200/202 status when system health is GREEN.
-   **Function Invocation:**
    -   Verify `recordBuildStart` is called with correct parameters on `/build/start`.
    -   Verify `recordBuildComplete` is called with correct parameters on `/build/complete` (GREEN health).
-   **Health Check Logic:**
    -   Simulate a RED health status for `canMarkBuildDone`. `POST /build/complete` should return a 409 Conflict.
    -   Simulate a GREEN health status for `canMarkBuildDone`. `POST /build/complete` should return 200/202.
-   **Isolation:** Confirm no regressions or unintended side effects on existing LifeOS or TSOS functionalities.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If any of the `/build` routes are unreachable or return unexpected HTTP status codes (e.g., 500, 404).
-   If `recordBuildStart` or `recordBuildComplete` are not invoked, or if their internal logic fails (e.g., database write errors).
-   If the 409 Conflict for `canMarkBuildDone` (RED health) is not triggered, or if it triggers when health is GREEN.
-   If any existing LifeOS user features or TSOS customer-facing surfaces exhibit altered behavior or errors.
-   If the build process itself (as observed by BuilderOS) does not correctly reflect the start/complete states after these calls.