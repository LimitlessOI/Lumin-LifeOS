# Amendment 46 BuilderOS Control Plane Proof - G33-100 Remediation

This document outlines the remediation plan and proof-closing blueprint note for the BuilderOS control plane, addressing the OIL verifier rejection and ensuring the specified build lifecycle events are correctly wired.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of build lifecycle events within the `routes/lifeos-council-builder-routes.js` handler for the `/build` endpoint. Specifically:
- The `POST /build` endpoint does not currently invoke `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used` at the initiation of a build.
- The `POST /build` endpoint does not invoke `recordBuildComplete` with the build token and OIL receipt IDs upon build completion.
- The `POST /build` endpoint does not perform a `canMarkBuildDone` check and return a 409 conflict status if this check fails (indicating a RED health state for marking build completion).

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying the existing `POST /build` route handler in `routes/lifeos-council-builder-routes.js`. This modification will:
1.  **Pre-build hook:** Add a call to `recordBuildStart` at the beginning of the build process, extracting `task_id`, `blueprint_id`, and `model_used` from the request body.
2.  **Post-build hook:** Add a call to `recordBuildComplete` upon successful build completion, extracting the build token and OIL receipt IDs from the response or a completion payload.
3.  **Health check:** Implement a conditional check using `canMarkBuildDone` before allowing build completion. If `canMarkBuildDone` returns `false` (indicating RED health), the endpoint should immediately respond with a 409 status code.

This slice focuses solely on extending the existing route logic without altering core BuilderOS execution or LifeOS user features.

## 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`: This file will contain the direct modifications to the route handler.
- `services/builder-control-plane.js` (or similar existing service file): If `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not already defined or imported, they will need to be implemented or exposed here. Assuming these are existing internal functions, they will be imported into the route file.

## 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   Verify `recordBuildStart` is called with correct parameters on `POST /build` initiation.
    -   Verify `recordBuildComplete` is called with correct parameters on `POST /build` completion.
    -   Verify `canMarkBuildDone` is called before `recordBuildComplete`.
    -   Verify `canMarkBuildDone` returning `false` results in a 409 response.
-   **Integration Tests:**
    -   Send a `POST /build` request and confirm `recordBuildStart` event logging.
    -   Simulate a build completion (e.g., via a subsequent internal call or mock) and confirm `recordBuildComplete` event logging with correct token and OIL receipt IDs.
    -   Configure BuilderOS health to RED (mock `canMarkBuildDone` to return `false`) and attempt to complete a build; assert a 409 response.
    -   Configure BuilderOS health to GREEN (mock `canMarkBuildDone` to return `true`) and attempt to complete a build; assert a successful completion (e.g., 200 OK).
-   **Runtime Monitoring:**
    -   Observe internal logs for `recordBuildStart` and `recordBuildComplete` events during active builds.
    -   Monitor BuilderOS control plane metrics for build lifecycle state transitions.
    -   Verify that 409 responses are correctly issued when BuilderOS health is degraded and build completion is attempted.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` or `recordBuildComplete` events are not consistently logged or contain incorrect data.
-   If the `POST /build` endpoint does not return a 409 status when `canMarkBuildDone` indicates a RED health state.
-   If the BuilderOS control plane exhibits unexpected state transitions or data inconsistencies related to build lifecycle.
-   If the modifications introduce regressions in existing BuilderOS functionality or impact LifeOS user features.
-   If performance degradation is observed in the `/build` endpoint or related services.