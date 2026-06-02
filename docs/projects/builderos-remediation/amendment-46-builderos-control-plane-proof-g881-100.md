Amendment 46: BuilderOS Control Plane Proof - G881-100

Blueprint Note: BuilderOS Control Plane Route Wiring Remediation

This document serves as a proof-closing note for the implementation required by Amendment 46, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js` for BuilderOS control plane operations after OIL verifier rejection.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of a robust `POST /build` route handler within `routes/lifeos-council-builder-routes.js` that correctly orchestrates the BuilderOS control plane signals: `recordBuildStart`, `recordBuildComplete`, and the `canMarkBuildDone` health check. The previous attempt failed due to a verifier misconfiguration attempting to execute the `.md` file as code, not due to an issue with the proposed implementation logic itself. The core implementation gap remains the wiring of these functions into the HTTP route.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
-   Defining a `POST` endpoint for `/build` in `routes/lifeos-council-builder-routes.js`.
-   Implementing the handler to:
    -   Extract `task_id`, `blueprint_id`, `model_used` from the request body for build start.
    -   Call `recordBuildStart({ task_id, blueprint_id, model_used })` at the beginning of the build process.
    -   Extract `token` and `OIL receipt IDs` from the request body for build completion.
    -   Call `recordBuildComplete` with the extracted `token` and `OIL receipt IDs` upon build completion.
    -   Before calling `recordBuildComplete`, invoke `canMarkBuildDone()`. If it returns `false` (indicating health RED), immediately return a `409 Conflict` status.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will contain the new `POST /build` route definition and its handler logic.
-   `services/builder-control-plane.js` (or similar existing internal service): This is the assumed location for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If these do not exist, they would need to be created here, ensuring they are internal to BuilderOS.

### 4. Verifier/Runtime Checks

**Verifier Checks (Automated):**
-   **Route Existence:** Verify `POST /build` is defined in `routes/lifeos-council-builder-routes.js`.
-   **Function Calls:** Static analysis to confirm `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are called within the `/build` handler.
-   **Error Handling:** Verify `409` status is returned conditionally based on `canMarkBuildDone` result.

**Runtime Checks (Integration/E2E):**
-   **Build Start Flow:** Send `POST /build` with start parameters. Verify `recordBuildStart` is logged/executed with correct `task_id`, `blueprint_id`, `model_used`.
-   **Build Complete Flow (Healthy):** Send `POST /build` with completion parameters when BuilderOS health is GREEN. Verify `recordBuildComplete` is logged/executed with correct `token` and `OIL receipt IDs`, and a `200 OK` or `202 Accepted` is returned.
-   **Build Complete Flow (Unhealthy):** Send `POST /build` with completion parameters when BuilderOS health is RED (simulating `canMarkBuildDone` returning `false`). Verify a `409 Conflict` status is returned, and `recordBuildComplete` is *not* called.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build` endpoint is not reachable or returns unexpected HTTP status codes (e.g., 404, 500) under normal operation.
-   If `recordBuildStart` is not invoked or receives an incorrect payload when a build is initiated.
-   If `recordBuildComplete` is invoked when `canMarkBuildDone` indicates a RED health state, or if it's not invoked with the correct payload upon successful build completion.
-   If the `/build` endpoint does not return `409 Conflict` when `canMarkBuildDone` indicates a RED health state.
-   If the `/build` endpoint returns `409 Conflict` when `canMarkBuildDone` indicates a GREEN health state.
-   If any external BuilderOS monitoring or logging indicates a mismatch between expected control plane signals and actual system behavior.