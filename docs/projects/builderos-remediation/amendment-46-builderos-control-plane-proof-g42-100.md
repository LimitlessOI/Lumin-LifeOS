<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof - G42-100 Remediation Note -->

# Amendment 46 BuilderOS Control Plane Proof - G42-100 Remediation Note

This document outlines the remediation plan and proof for the BuilderOS control plane changes, addressing the OIL verifier rejection and ensuring the specified build lifecycle hooks are correctly integrated.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of explicit wiring for build lifecycle events within the `/build` endpoint of `routes/lifeos-council-builder-routes.js`. Specifically:
-   No `POST` internal call to `recordBuildStart({ task_id, blueprint_id, model_used })` at the initiation of a build.
-   No `recordBuildComplete` call with token and OIL receipt IDs upon build completion.
-   No conditional 409 response if `canMarkBuildDone` fails when the system health is RED.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying the existing `/build` POST handler in `routes/lifeos-council-builder-routes.js` to incorporate the required lifecycle event recording and health checks. This modification will be contained within the existing route handler logic, ensuring minimal impact on surrounding code.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the necessary logic within the `/build` POST handler.
-   `services/builder-lifecycle-service.js` (or similar existing internal service): This file is the assumed location for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If these functions do not exist, they will be implemented here following existing service patterns. If they exist, their interfaces will be confirmed.

## 4. Verifier/Runtime Checks

### Unit Tests
-   **`routes/lifeos-council-builder-routes.js`:**
    -   Verify that a `POST /build` request successfully calls `recordBuildStart` with the expected `task_id`, `blueprint_id`, and `model_used`.
    -   Verify that a simulated build completion event (e.g., via a callback or subsequent internal call) triggers `recordBuildComplete` with the correct token and OIL receipt IDs.
    -   Verify that if `canMarkBuildDone` returns `false` when health is RED, the route handler returns a 409 status code.
    -   Verify that if `canMarkBuildDone` returns `true` (or health is not RED), the build completion proceeds normally.
-   **`services/builder-lifecycle-service.js` (if functions are implemented/modified):**
    -   Unit tests for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` to ensure their internal logic is sound.

### Integration Tests
-   **End-to-End Build Flow:**
    -   Initiate a build via `POST /build` and confirm `recordBuildStart` is logged/persisted.
    -   Monitor the build process to completion and confirm `recordBuildComplete` is logged/persisted with correct OIL receipt IDs.
    -   Simulate a RED health state and attempt to mark a build done; verify a 409 response is received.
    -   Simulate a GREEN health state and attempt to mark a build done; verify successful completion.

### Runtime Monitoring
-   Observe application logs for successful invocations of `recordBuildStart` and `recordBuildComplete` during live BuilderOS operations.
-   Monitor API gateway logs for 409 responses from `/build` endpoint, correlating with known RED health states.
-   Track BuilderOS build success rates and completion metrics to ensure no regressions.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` or `recordBuildComplete` calls are inconsistent, missing, or contain incorrect data in logs/persistence.
-   If the `/build` endpoint does not return a 409 status code when `canMarkBuildDone` fails under RED health conditions.
-   If the overall BuilderOS build success rate or throughput significantly degrades after deployment of these changes.
-   If any existing BuilderOS functionality or LifeOS user features are negatively impacted or exhibit unexpected behavior.
-   If the OIL verifier continues to reject the build due to issues related to this specific amendment, indicating the underlying problem was not fully addressed.