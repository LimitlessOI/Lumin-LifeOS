<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof (G95-100) -->

# Amendment 46: BuilderOS Control Plane Proof (G95-100)

This document serves as a proof-closing blueprint note for Amendment 46, focusing on the BuilderOS Control Plane. It addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` to manage build start and completion events, including health-based access control.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of explicit route handlers within `routes/lifeos-council-builder-routes.js` that:
- Intercept a `POST` request for `/build/start` to invoke `recordBuildStart({ task_id, blueprint_id, model_used })`.
- Intercept a `POST` request for `/build/complete` to invoke `recordBuildComplete` with a build token and OIL receipt IDs.
- Implement a pre-check using `canMarkBuildDone` before allowing `recordBuildComplete`, returning a `409 Conflict` status if `canMarkBuildDone` fails due to a RED health status.

The current `routes/lifeos-council-builder-routes.js` does not contain the necessary middleware or route definitions to handle these specific BuilderOS control plane events with the required logic and error handling.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **Adding new POST routes** to `routes/lifeos-council-builder-routes.js` for `/build/start` and `/build/complete`.
2.  **Implementing route handlers** that import and call the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions from an appropriate BuilderOS control plane service (e.g., `builderControlService`).
3.  **Adding input validation** for `task_id`, `blueprint_id`, `model_used` for `/build/start` and for the build token and OIL receipt IDs for `/build/complete`.
4.  **Implementing the 409 conflict logic** based on the `canMarkBuildDone` health check result.

This slice focuses solely on the BuilderOS control plane routes and their immediate service interactions, avoiding modifications to existing LifeOS user features or TSOS customer-facing surfaces.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will receive the new route definitions and their corresponding handler logic.
-   `services/builderControlService.js` (inferred): This file is expected to contain (or be extended to contain) the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If it doesn't exist, a new file following existing service patterns would be created.
-   `utils/healthCheck.js` (inferred, if `canMarkBuildDone` relies on a shared health utility): To ensure `canMarkBuildDone` has access to the system's health status.

## 4. Verifier/Runtime Checks

To validate the implementation:

-   **Unit Tests (`test/routes/lifeos-council-builder-routes.test.js`):**
    -   Verify `POST /build/start` successfully calls `recordBuildStart` with correct parameters and returns 200/201.
    -   Verify `POST /build/start` handles missing/invalid parameters (e.g., 400 Bad Request).
    -   Verify `POST /build/complete` successfully calls `recordBuildComplete` with correct token and OIL receipt IDs and returns 200.
    -   Verify `POST /build/complete` returns 409 when `canMarkBuildDone` indicates RED health.
    -   Verify `POST /build/complete` handles missing/invalid parameters.
-   **Integration Tests (`test/integration/builder-control-plane.test.js`):**
    -   Execute a full build cycle simulation: call `/build/start`, then `/build/complete`. Verify database entries for build start and successful completion, including OIL receipt persistence.
    -   Simulate a RED health state (e.g., by mocking `canMarkBuildDone` or the underlying health service) and attempt `/build/complete`, asserting a 409 response.
-   **Manual Verification (Local Dev/Staging):**
    -   Use `curl` or Postman to hit the new endpoints and observe responses and system behavior.
    -   Monitor logs for `recordBuildStart` and `recordBuildComplete` invocations and data persistence.

## 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be halted and flagged for re-evaluation if any of the following conditions are met during verification:

-   **Incorrect Route Behavior:** `POST /build/start` or `POST /build/complete` do not respond as expected (e.g., wrong status code, missing data in response).
-   **Data Inconsistency:** `recordBuildStart` fails to persist