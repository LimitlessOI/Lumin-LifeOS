# Amendment 46: BuilderOS Control Plane Proof - G1091-100

## Proof-Closing Blueprint Note: Builder Control Plane Wiring

This document outlines the implementation plan to close the proof gap identified in Amendment 46 regarding the BuilderOS Control Plane. The primary focus is to wire the `routes/lifeos-council-builder-routes.js` to handle build start and completion signals, incorporating health checks for build finalization.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` currently lacks the necessary endpoints and associated logic to:
-   Receive and process a `POST` request signaling the start of a build, invoking `recordBuildStart`.
-   Receive and process a `POST` request signaling the completion of a build, invoking `recordBuildComplete`.
-   Perform a `canMarkBuildDone` check during build completion, specifically returning a `409 Conflict` if the system health is `RED` and `canMarkBuildDone` indicates failure.

The proof gap lies in the absence of these specific route definitions, their integration with the `builderControlService` and `healthService`, and the conditional error handling for build completion.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
2.  Implementing the request body parsing for `task_id`, `blueprint_id`, `model_used` for `/build/start`.
3.  Implementing the request body parsing for `token` and `oil_receipt_ids` for `/build/complete`.
4.  Calling `builderControlService.recordBuildStart` within the `/build/start` handler.
5.  Calling `healthService