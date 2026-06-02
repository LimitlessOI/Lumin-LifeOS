# Amendment 46 BuilderOS Control Plane Proof - G69-100

**Blueprint Note: Proof-Closing for BuilderOS Control Plane Wiring**

This document serves as a proof-closing note for the implementation of BuilderOS control plane wiring as specified in `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, specifically addressing the signal to wire `routes/lifeos-council-builder-routes.js`.

---

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build process (start and complete), coupled with the necessary health-based pre-conditions for marking a build as done. Specifically:
-   A `POST /build/start` endpoint to record the initiation of a build.
-   A `POST /build/complete` endpoint to record the successful completion of a build.
-   Integration of a `canMarkBuildDone` health check within the `/build/complete` flow, returning a 409 status if the system health is RED.
-   The underlying service/controller logic for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Defining two new `POST` routes in `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
2.  Creating or extending a `BuilderControlPlaneService` (or similar) to encapsulate the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` logic.
3.  Implementing `recordBuildStart` to persist build initiation details (`task_id`, `blueprint_id`, `model_used`).
4.  Implementing `recordBuildComplete` to persist build completion details (`token`, `oil_receipt_ids`).
5.  Implementing `canMarkBuildDone` to query the system's health status, returning `false` if health is RED.
6.  Integrating `canMarkBuildDone` into the `/build/complete` route handler to conditionally return a 409.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: Add new route definitions.
-   `services/builder-control-plane-service.js` (or create if not exists): Implement core business logic for build state management and health checks.
-   `controllers/builder-control-plane-controller.js` (or create if not exists): Implement route handlers that orchestrate calls to the service layer.
-   `utils/health-check-util.js` (or similar, if `canMarkBuildDone` is a generic health check): Provide the underlying health status.

### 4. Verifier/Runtime Checks

1.  **Build Start Success:**
    -   `POST /lifeos-council/build/start` with `{ "task_id": "t123", "blueprint_id": "b456", "model_used": "g7" }`
    -   **Expected Outcome:** HTTP 200/201. Database record for build `t123` exists with `status: 'started'`, `blueprint_id: 'b456'`, `model_used: 'g7'`.
2.  **Build Complete Success:**
    -   Ensure system health is GREEN (i.e., `canMarkBuildDone` returns `true`).
    -   `POST /lifeos-council/build/complete` with `{ "token": "build-token-xyz", "oil_receipt_ids": ["oil-r1", "oil-r2"] }`
    -   **Expected Outcome:** HTTP 200/201. Database record for the corresponding build (identified by token) exists with `status: 'completed'`, `oil_receipt_ids: ["oil-r1", "oil-r2"]`.
3.  **Build Complete Health Failure (409):**
    -   Manually set system health to RED (i.e., `canMarkBuildDone` returns `false`).
    -   `POST /lifeos-council/build/complete` with `{ "token": "build-token-abc", "oil_receipt_ids": ["oil-r3"] }`
    -   **Expected Outcome:** HTTP 409. No change in the database record for the corresponding build's status.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /lifeos-council/build/start` does not return 200/201 or fails to persist the build start record.
-   If `POST /lifeos-council/build/complete` does not return 200/201 when health is GREEN, or fails to persist the build complete record.
-   If `POST /lifeos-council/build/complete` does not return 409 when health is RED, or incorrectly persists a completion record.
-   If any route handler throws an unhandled exception or returns an unexpected server error (5xx).