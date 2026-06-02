# Amendment 46 BuilderOS Control Plane Proof - G830-100 Remediation

This document outlines the remediation plan and proof for the BuilderOS control plane wiring, addressing the OIL verifier rejection. The previous attempt incorrectly submitted JavaScript code as a markdown proof document, leading to a file extension error. This proof details the required changes to `routes/lifeos-council-builder-routes.js` to correctly implement the build lifecycle hooks.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of wired routes in `routes/lifeos-council-builder-routes.js` to handle the BuilderOS build lifecycle events:
-   `POST /build/start`: To record the initiation of a build.
-   `POST /build/complete`: To record the successful completion of a build, including OIL receipt IDs.
-   Health check integration: To prevent marking a build as done if the system health is critical (RED).

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST routes and associated logic within `routes/lifeos-council-builder-routes.js`. This slice leverages existing `builderControlService` functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, `getSystemHealthStatus`) as per the original blueprint's implied service structure.

## 3. Exact Safe-Scope Files to Touch First

The primary file to modify is:
-   `routes/lifeos-council-builder-routes.js`

Assuming `builderControlService.js` and its exported functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, `getSystemHealthStatus`) are already implemented and stable. If not, `services/builderControlService.js` would be the secondary file to touch for implementation of these functions.

## 4. Verifier/Runtime Checks

### Verifier Checks:
-   **Syntax Check:** Ensure `routes/lifeos-council-builder-routes.js` passes Node.js ESM syntax validation.
-   **Route Existence:** Verify that `POST /build/start` and `POST /build/complete` are correctly defined and accessible via the BuilderOS control plane.
-   **Payload Validation:** Confirm that `recordBuildStart` receives `task_id`, `blueprint_id`, and `model_used`. Confirm `recordBuildComplete` receives `token` and `oil_receipt_ids`.

### Runtime Checks:
-   **Successful Build Start:**
    -   Trigger `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used`.
    -   Verify `recordBuildStart` is called and logs/persists the build start event.
    -   Expected HTTP Status: `200 OK` or `201 Created`.
-   **Successful Build Complete:**
    -   Trigger `POST /build/complete` with valid `token` and `oil_receipt_ids`.
    -   Verify `recordBuildComplete` is called and logs/persists the build completion event.
    -   Verify `canMarkBuildDone` is called.
    -   Expected HTTP Status: `200 OK`.
-   **Build Complete with Health RED:**
    -   Manually set `getSystemHealthStatus` to return 'RED'.
    -   Trigger `POST /build/complete`.
    -   Verify `canMarkBuildDone` is called and returns `false`.
    -   Expected HTTP Status: `409 Conflict`.
    -   Verify `recordBuildComplete` is *not* called in this scenario.
-   **Error Handling:** Test invalid payloads for both routes to ensure appropriate error responses (e.g., `400 Bad Request`).

## 5. Stop Conditions if Runtime Truth Disagrees

-   **Route Not Found (404):** If `POST /build/start` or `POST /build/complete` return 404, the routing setup is incorrect. Stop and re-evaluate `routes/lifeos-council-builder-routes.js` and its integration into the main application.
-   **Incorrect Service Calls:** If `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` are not invoked as expected (verified via logs/mocking), the middleware or route handler logic is flawed. Stop and debug the route handlers.
-   **Incorrect HTTP Status Codes:** If the system returns `200` when `409` is expected (health RED), or vice-versa, the conditional logic for `canMarkBuildDone` and `getSystemHealthStatus` is incorrect. Stop and review the health check integration.
-   **Data Inconsistency:** If build start/complete events are not correctly recorded or associated with the provided IDs, there's an issue with the `builderControlService` integration or implementation. Stop and investigate the service layer.

This proof closes the loop on the BuilderOS control plane wiring, providing a clear path for implementation and verification.