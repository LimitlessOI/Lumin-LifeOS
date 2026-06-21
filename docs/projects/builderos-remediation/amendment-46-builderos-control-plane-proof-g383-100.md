<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G383 100. -->

### Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane - G383-100

This document outlines the necessary steps to implement the BuilderOS control plane wiring within `routes/lifeos-council-builder-routes.js` as specified by Amendment 46.

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` module currently lacks the required API endpoints and their corresponding internal service integrations to manage the BuilderOS build lifecycle. Specifically, the following are missing:
-   A `POST /build/start` endpoint to initiate a build record, accepting `task_id`, `blueprint_id`, and `model_used`.
-   A `POST /build/complete` endpoint to finalize a build record, requiring a `token` and `OIL receipt IDs`.
-   The necessary logic within the `/build/complete` flow to invoke `canMarkBuildDone` and return a `409 Conflict` status if this check fails, particularly when the system health is RED.
-   Integration with the underlying BuilderOS service layer for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.

**2. Smallest Safe Build Slice to Close It:**
The implementation slice involves adding two new POST routes to `routes/lifeos-council-builder-routes.js` and developing their associated controller and service layer logic. This work is strictly confined to the BuilderOS control plane and must not introduce changes to LifeOS user features or TSOS customer-facing surfaces.

**3. Exact Safe-Scope Files to Touch First:**
-   `routes/lifeos-council-builder-routes.js`: Add new route definitions for `/build/start` and `/build/complete`.
-   `controllers/builderos-controller.js`: Implement new controller functions to handle requests for `/build/start` and `/build/complete`, including parameter validation and orchestration of service calls.
-   `services/builderos-control-plane-service.js`: Extend or create functions for `recordBuildStart({ task_id, blueprint_id, model_used })`, `recordBuildComplete({ token, oil_receipt_ids })`, and `canMarkBuildDone()`. These functions will encapsulate the core business logic and data interactions.

**4. Verifier/Runtime Checks:**
-   **Unit Tests:**
    -   Verify `POST /build/start` correctly parses input parameters (`task_id`, `blueprint_id`, `model_used`) and calls `builderosControlPlaneService.recordBuildStart` with them.
    -   Verify `POST /build/complete` correctly parses `token` and `oil_receipt_ids` and calls `builderosControlPlaneService.recordBuildComplete`.
    -   Verify `POST /build/complete` returns `409 Conflict` when `builderosControlPlane