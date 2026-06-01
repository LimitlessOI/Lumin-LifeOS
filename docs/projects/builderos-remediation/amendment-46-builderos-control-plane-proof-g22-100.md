# Amendment 46: BuilderOS Control Plane Proof - G22-100

This document outlines the proof-closing blueprint note for the BuilderOS control plane remediation, specifically addressing the integration of build lifecycle hooks and health checks within `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of wired endpoints and corresponding internal function calls within `routes/lifeos-council-builder-routes.js` to manage the build lifecycle and enforce health-based completion conditions. Specifically:
-   No `POST` endpoint for `/build/start` to trigger `recordBuildStart`.
-   No `POST` endpoint for `/build/complete` to trigger `recordBuildComplete` and evaluate `canMarkBuildDone`.
-   The internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are either not fully implemented or not correctly exposed/imported for use by the router.

## 2. Smallest Safe Build Slice to Close It

Implement two new `POST` endpoints in `routes/lifeos-council-builder-routes.js`:
1.  `POST /build/start`: Accepts `task_id`, `blueprint_id`, and `model_used` in the request body. Calls an internal `recordBuildStart` function.
2.  `POST /build/complete`: Accepts a `token` and `oil_receipt_ids` in the request body. Before calling `recordBuildComplete`, it must check `canMarkBuildDone()`. If `canMarkBuildDone()` returns `false` (indicating RED health), the endpoint must return a `409 Conflict` status. Otherwise, it proceeds to call `recordBuildComplete`.

The internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` should be defined or imported from a dedicated builder control plane service/utility module. For this slice, a minimal stub implementation within the router's scope or a new `services/builderControlPlaneService.js` is sufficient to prove the wiring.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: Add the new `POST` route definitions and their handlers.
-   `services/builderControlPlaneService.js` (new file, or extend existing builder service): Implement/export `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. This file is assumed to be the appropriate place for builder-specific logic, adhering to existing patterns of separating routing from business logic.

## 4. Verifier/Runtime Checks

-   **Unit/Integration Tests:**
    -   `POST /build/start` with valid payload returns 200/204 and `recordBuildStart` is invoked with correct arguments.
    -   `POST /build/complete` with valid payload, when `canMarkBuildDone()` is true, returns 200/204 and `recordBuildComplete` is invoked.
    -   `POST /build/complete` with valid payload, when `canMarkBuildDone()` is false (simulating RED health), returns `409 Conflict`.
    -   Ensure no existing routes or BuilderOS functionality are impacted.
-   **Runtime Monitoring:**
    -   Observe successful invocation logs for `recordBuildStart` and `recordBuildComplete` during actual build lifecycle events.
    -   Monitor for `409 Conflict` responses from `/build/complete` when the BuilderOS health status is genuinely RED.
    -   Verify that build completion proceeds normally when health is GREEN.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` or `recordBuildComplete` are not called or fail to process their respective payloads during build lifecycle events.
-   If `POST /build/complete` does not return `409 Conflict` when `canMarkBuildDone()` indicates a RED health state.
-   If `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone()` indicates a GREEN health state.
-   Any observed regression or unexpected behavior in other BuilderOS control plane operations.
-   Any unhandled exceptions or critical errors originating from the new route handlers or service calls.