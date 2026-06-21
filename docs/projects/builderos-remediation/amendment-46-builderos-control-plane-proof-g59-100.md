<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof (G59-100) -->

# Amendment 46 BuilderOS Control Plane Proof (G59-100)

This document outlines the remediation plan and proof for the BuilderOS control plane, addressing the identified gaps in the `routes/lifeos-council-builder-routes.js` wiring.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the `/build` endpoints within `routes/lifeos-council-builder-routes.js` to correctly interact with the BuilderOS control plane's state management functions. Specifically:

*   **Missing `POST /build/start` endpoint:** This endpoint is required to initiate a build record by calling `recordBuildStart({ task_id, blueprint_id, model_used })`.
*   **Missing `POST /build/complete` endpoint:** This endpoint is required to finalize a build record by calling `recordBuildComplete` with a build token and OIL receipt IDs.
*   **Missing health-check based conflict handling:** The `/build/complete` endpoint must return a `409 Conflict` status if `canMarkBuildDone()` fails when the system health is `RED`.

These omissions prevent the BuilderOS governed loop from accurately tracking build lifecycle events and enforcing critical state transitions based on system health.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding the necessary route definitions and their corresponding handler logic directly within `routes/lifeos-council-builder-routes.js`. This includes:

1.  Importing required internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, `getSystemHealth`).
2.  Defining a `POST /build/start` route handler.
3.  Defining a `POST /build/complete` route handler, incorporating the `canMarkBuildDone` and system health check logic.

This approach minimizes changes to existing files and introduces new functionality in a contained, BuilderOS-specific scope.

## 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js` (Primary modification target)
*   `services/builder-service.js` (Assumed location for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`)
*   `utils/health-monitor.js` (Assumed location for `getSystemHealth`)

## 4. Verifier/Runtime Checks

### Verifier Checks (Pre-deployment)

*   **Static Analysis:** Ensure `routes/lifeos-council-builder-routes.js` correctly imports and utilizes `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and `getSystemHealth`.
*   **Unit Tests:**
    *   Verify `POST /build/start` handler calls `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
    *   Verify `POST /build/complete` handler calls `recordBuildComplete` with `token` and `oil_receipt_ids`.
    *   Verify `POST /build/complete` handler returns `409` when `canMarkBuildDone` returns `false` and `getSystemHealth` returns `RED`.
    *   Verify `POST /build/complete` handler returns `2xx` when `canMarkBuildDone` returns `true` or `getSystemHealth` is not `RED`.
*   **Integration Tests:**
    *   Simulate a full build lifecycle: `POST /build/start` followed by `POST /build/complete` and verify state transitions in the BuilderOS database.
    *   Test `POST /build/complete` under `RED` health conditions where `canMarkBuildDone` fails, asserting a `409` response.

### Runtime Checks (Post-deployment)

*   **Logging:** Monitor application logs for successful invocations of `recordBuildStart` and `recordBuildComplete` during BuilderOS loop execution.
*   **Metrics:** Track HTTP response codes for `/build/start` and `/build/complete` endpoints, specifically looking for expected `2xx` and `409` responses.
*   **BuilderOS State:** Observe the BuilderOS control plane's internal state to confirm builds are correctly marked as `started` and `completed` in alignment with API calls.
*   **Health Monitor Integration:** Verify that `409` responses from `/build/complete` correlate with `RED` system health and `canMarkBuildDone` failures.

## 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be halted and rolled back if any of the following conditions are observed in runtime:

*   `recordBuildStart` or `recordBuildComplete` are not invoked or are invoked with incorrect parameters during a BuilderOS loop.
*   `POST /build/complete` consistently returns `2xx` status codes when `canMarkBuildDone` fails and system health is `RED`.
*   `POST /build/complete` incorrectly returns `409` when `canMarkBuildDone` succeeds or system health is not `RED`.
*   The BuilderOS control plane fails to transition build states (`started`, `completed`) correctly after API invocations.
*   Any unexpected errors or performance degradation are observed in `routes/lifeos-council-builder-routes.js` or related services.