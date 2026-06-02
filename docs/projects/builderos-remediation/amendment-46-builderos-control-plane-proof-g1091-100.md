Amendment 46: BuilderOS Control Plane Proof - G1091-100
Proof-Closing Blueprint Note: Builder Control Plane Wiring
This document outlines the implementation plan to close the proof gap identified in Amendment 46 regarding the BuilderOS Control Plane. The primary focus is to wire the `routes/lifeos-council-builder-routes.js` to handle build start and completion signals, incorporating health checks for build finalization.

1. Exact Missing Implementation or Proof Gap
The `routes/lifeos-council-builder-routes.js` currently lacks the necessary endpoints and associated logic to:
-   Receive and process a `POST` request signaling the start of a build, invoking `recordBuildStart({ task_id, blueprint_id, model_used })`. The specific route `/build/start` is missing.
-   Receive and process a `POST` request signaling the completion of a build, invoking `recordBuildComplete` with `token` and `oil_receipt_ids`. The specific route `/build/complete` is missing.
-   Perform a `canMarkBuildDone` check during build completion, specifically returning a `409 Conflict` if the system health is `RED` and `canMarkBuildDone` indicates failure.

The proof gap lies in the absence of these specific route definitions, their integration with the `builderControlService` and `healthService`, and the conditional error handling for build completion.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
1.  Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
2.  Implementing the request body parsing for `task_id`, `blueprint_id`, `model_used` for the `/build/start` handler.
3.  Implementing the request body parsing for `token` and `oil_receipt_ids` for the `/build/complete` handler.
4.  Calling `builderControlService.recordBuildStart` within the `/build/start` handler.
5.  Calling `healthService.canMarkBuildDone` before `builderControlService.recordBuildComplete` in the `/build/complete` handler.
6.  Implementing conditional logic to return `409 Conflict` if `healthService.canMarkBuildDone` returns `false` when the system health is `RED`.
7.  Calling `builderControlService.recordBuildComplete` within the `/build/complete` handler upon successful `canMarkBuildDone` check.

3. Exact Safe-Scope Files to Touch First
-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new POST routes and their respective handlers.
-   `services/builderControlService.js`: Ensure `recordBuildStart` and `recordBuildComplete` methods exist and accept the specified parameters. No new methods are expected to be added, only existing ones called.
-   `services/healthService.js`: Ensure `canMarkBuildDone` method exists and returns a boolean indicating build completion readiness. No new methods are expected to be added, only existing ones called.
-   `utils/errorHandlers.js` (or similar): Potentially extend or utilize existing error handling for 409 responses, if a common pattern exists.

4. Verifier/Runtime Checks
-   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
    -   Verify `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used` successfully calls `builderControlService.recordBuildStart` and returns `200 OK`.
    -   Verify `POST /build/start` with missing required parameters returns `400 Bad Request`.
    -   Verify `POST /build/complete` with valid `token`, `oil_receipt_ids` successfully calls `healthService.canMarkBuildDone` (returning true) and `builderControlService.recordBuildComplete`, then returns `200 OK`.
    -   Verify `POST /build/complete` when `healthService.canMarkBuildDone` returns `false` (simulating RED health) returns `409 Conflict` and does NOT call `builderControlService.recordBuildComplete`.
    -   Verify `POST /build/complete` with missing required parameters returns `400 Bad Request`.
-   **Integration Tests (`tests/integration/builder-flow.test.js`):**
    -   Simulate a complete build lifecycle: `POST /build/start` followed by `POST /build/complete` (success path).
    -   Simulate a build completion attempt when health is `RED` and `canMarkBuildDone` fails, asserting a `409 Conflict` response.
-   **Runtime Monitoring:**
    -   Observe application logs for successful invocations of `recordBuildStart` and `recordBuildComplete`.
    -   Monitor HTTP access logs for `200 OK` on `/build/start` and `/build/complete` (success).
    -   Monitor HTTP access logs for `409 Conflict` on `/build/complete` (failure due to health/`canMarkBuildDone`).
    -   Verify no unexpected `5xx` errors are introduced on these routes.

5. Stop Conditions if Runtime Truth Disagrees
-   If `recordBuildStart` or `recordBuildComplete` service methods are not invoked as expected during successful build flows.
-   If `POST /build/start` or `POST /build/complete` consistently return `5xx` errors, indicating a deeper system issue.
-   If `POST /build/complete` returns `200 OK` when `healthService.canMarkBuildDone` would have returned `false` (i.e., the 409 logic is bypassed).
-   If `POST /build/complete` returns `409 Conflict` when `healthService.canMarkBuildDone` would have returned `true` (i.e., false positive 409).
-   If the deployment of these changes leads to increased latency or resource consumption in the BuilderOS control plane.
-   If existing BuilderOS functionalities or LifeOS user features are inadvertently impacted (though this scope is strictly BuilderOS-only).