# Amendment 46: BuilderOS Control Plane Proof - G11-100 Remediation

This document outlines the proof-closing blueprint note for the BuilderOS control plane, specifically addressing the integration of build start/complete signals and health checks within `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of explicit route handlers within `routes/lifeos-council-builder-routes.js` to:
-   Receive a `POST` request signaling the start of a build and internally call `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
-   Receive a `POST` request signaling the completion of a build and internally call `recordBuildComplete` with a `token` and `OIL receipt IDs`.
-   Enforce a pre-completion check using `canMarkBuildDone` (presumably from a health or status service) and return a `409 Conflict` status if this check fails while the system health is in a 'RED' state.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to add or extend the `/build` endpoint to handle `start` and `complete` sub-routes. This will involve:
-   Defining two new `POST` routes: `/build/start` and `/build/complete`.
-   Implementing the logic within these handlers to call the respective internal service functions (`recordBuildStart`, `recordBuildComplete`).
-   Integrating the `canMarkBuildDone` check and conditional `409` response for the `/build/complete` route.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will contain the new route definitions and their handlers.
-   `services/builderService.js` (inferred): This file is the most likely candidate to house or expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If these functions do not exist, they should be added here following existing service patterns.
-   `utils/healthService.js` (inferred): If `canMarkBuildDone` relies on a separate health service, this file might be touched to expose health status.

## 4. Verifier/Runtime Checks

### Unit Tests
-   **`routes/lifeos-council-builder-routes.js`**:
    -   Verify `POST /build/start` correctly calls `builderService.recordBuildStart` with expected parameters.
    -   Verify `POST /build/complete` correctly calls `builderService.recordBuildComplete` with expected parameters.
    -   Verify `POST /build/complete` returns `409` when `builderService.canMarkBuildDone` returns `false` and health is `RED`.
    -   Verify `POST /build/complete` returns `200` (or appropriate success code) when `builderService.canMarkBuildDone` returns `true` or health is not `RED`.

### Integration Tests
-   Deploy the updated `lifeos-council-builder-routes.js` and associated services.
-   Execute end-to-end tests:
    -   Send `POST /build/start` and verify internal state reflects a build initiation.
    -   Send `POST /build/complete` (under normal conditions) and verify internal state reflects build completion and OIL receipt processing.
    -   Send `POST /build/complete` while simulating a `RED` health state and `canMarkBuildDone` failure, verifying a `409` response.

### Manual Verification
-   Using a tool like `curl` or Postman, manually trigger the `/build/start` and `/build/complete` endpoints with various valid and invalid payloads, observing server responses and internal logs.
-   Manually toggle system health states (if possible) to verify the `409` behavior for `/build/complete`.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` or `recordBuildComplete` are not invoked or fail to process their respective data payloads as expected.
-   If the `/build/complete` endpoint does not consistently return a `409` status when `canMarkBuildDone` indicates a failure under `RED` health conditions.
-   If the build lifecycle within BuilderOS (as observed through logs or monitoring) does not correctly transition states after these route calls.
-   If any existing BuilderOS or LifeOS functionality is regressed or exhibits unexpected behavior due to these changes.
-   If the OIL verifier continues to reject the `.md` file due to syntax errors, indicating a misconfiguration in the verifier itself rather than the content.