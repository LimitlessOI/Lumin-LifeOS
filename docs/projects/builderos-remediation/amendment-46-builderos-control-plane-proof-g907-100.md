# Amendment 46: BuilderOS Control Plane Proof - G907-100 Remediation

This document outlines the remediation plan and proof for the BuilderOS control plane changes, addressing the OIL verifier rejection and ensuring the specified build lifecycle events are correctly wired and handled.

## 1. Exact Missing Implementation or Proof Gap

The primary gap identified is the incomplete wiring of the `/build` lifecycle endpoints within `routes/lifeos-council-builder-routes.js`. Specifically:
- The `POST /build/start` endpoint is missing the internal call to `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
- The `POST /build/complete` endpoint is missing the internal call to `recordBuildComplete` with the build token and OIL receipt IDs.
- The `POST /build/complete` endpoint lacks the conditional check using `canMarkBuildDone` to return a `409 Conflict` status when the BuilderOS health is in a RED state.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing the necessary route handlers and integrating the control plane service functions within `routes/lifeos-council-builder-routes.js`. This includes:
- Defining a `POST` route for `/build/start` that extracts `task_id`, `blueprint_id`, and `model_used` from the request body and calls `builderControlPlaneService.recordBuildStart()`.
- Defining a `POST` route for `/build/complete` that extracts the build token and OIL receipt IDs, performs a check using `builderControlPlaneService.