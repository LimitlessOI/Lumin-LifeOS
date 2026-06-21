<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof - G445-100 -->

# Amendment 46 BuilderOS Control Plane Proof - G445-100

This document serves as a proof-closing blueprint note for the implementation of BuilderOS control plane wiring within `routes/lifeos-council-builder-routes.js`, as specified by Amendment 46.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to signal the start and completion of a BuilderOS build process, along with the necessary health check integration for build completion. Specifically:
*   A `POST /build/start` endpoint to record build initiation.
*   A `POST /build/complete` endpoint to record build finalization, including a health-based pre-condition check.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST routes to `routes/lifeos-council-builder-routes.js` and integrating them with existing or new service functions for build state management and health checks.

**Implementation Details:**

1.  **`POST /build/start` Endpoint:**
    *   Define a new POST route at `/build/start`.
    *   Extract `task_id`, `blueprint_id`, and `model_used` from the request body.
    *   Call an internal service function (e.g., `builderService.recordBuildStart`) with these parameters.
    *   Return a 200/204 status on success.

2.  **`POST /build/complete` Endpoint:**
    *   Define a new POST route at `/build/complete`.
    *   Extract `token` and `oil_receipt_ids` (assuming an array or string) from the request body.
    *   Before proceeding, call an internal service function (e.g., `builderService.canMarkBuildDone`) to check the system's health status.
    *   If `builderService.canMarkBuildDone` returns `false` (indicating RED health), immediately return a `409 Conflict` status.
    *   If health is GREEN, call an internal service function (e.g., `builderService.recordBuildComplete`) with the extracted `token` and `oil_receipt_ids`.
    *   Return a 200/204 status on success.

## 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their respective handlers.
*   `services/builder-service.js` (or equivalent): This file is assumed to contain or will be extended to contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If these do not exist, their creation within this service layer is part of the build slice.

## 4. Verifier/Runtime Checks

*   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
    *   Verify `POST /build/start` with valid payload returns 200/204 and calls `builderService.recordBuildStart` with correct arguments.
    *   Verify `POST /build/start` with missing required fields returns 400.
    *   Verify `POST /build/complete` with valid payload returns 200/204 and calls `builderService.recordBuildComplete`.
    *   Verify `POST /build/complete` returns 409 when `builderService.canMarkBuildDone` returns `false`.
    *   Verify `POST /build/complete` with missing required fields returns 400.
*   **Integration Tests:**
    *   Execute a simulated BuilderOS build flow: call `/build/start`, then `/build/complete`. Assert the sequence of service calls and final state.
    *   Simulate a RED health state and attempt `/build/complete`, asserting the 409 response.
*   **Runtime/E2E Checks:**
    *   Trigger a BuilderOS build via the control plane. Monitor logs to confirm `