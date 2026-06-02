# Amendment 46: BuilderOS Control Plane Proof - G146-100

This document serves as a proof-closing blueprint note for `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, specifically addressing the signal to wire `routes/lifeos-council-builder-routes.js` for build start and complete events.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints and associated controller/service logic to:
1.  Receive and process a `/build/start` signal, recording `task_id`, `blueprint_id`, and `model_used`.
2.  Receive and process a `/build/complete` signal, recording a build token and OIL receipt IDs.
3.  Perform a health check using `canMarkBuildDone` before marking a build complete, returning a 409 Conflict status if the health is RED.

This gap prevents the BuilderOS control plane from accurately tracking the lifecycle of builds and enforcing health-based completion constraints.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves introducing two new POST routes and their corresponding controller/service methods, along with the health check integration.

**Proposed Changes:**

1.  **Route Definition:** Add two new POST routes to `routes/lifeos-council-builder-routes.js`:
    *   `POST /build/start`
    *   `POST /build/complete`
2.  **Controller Logic:** Implement or extend a `builderControlPlaneController` (or similar) to handle these routes:
    *   `recordBuildStart(req, res)`: Extracts `task_id`, `blueprint_id`, `model_used` from `req.body` and calls a service layer function.
    *   `recordBuildComplete(req, res)`: Extracts `token` and `oil_receipt_ids` from `req.body`. Before proceeding, it calls a `canMarkBuildDone()` service function. If `canMarkBuildDone()` returns false (indicating RED health), it responds with a 409 status. Otherwise, it calls a service layer function to record completion.
3.  **Service Layer:** Implement or extend a `builderControlPlaneService` (or similar) to encapsulate business logic:
    *   `recordBuildStart({ task_id, blueprint_id, model_used })`: Persists build start information.
    *   `recordBuildComplete({ token, oil_receipt_ids })`: Persists build completion information.
    *   `canMarkBuildDone()`: Checks the current BuilderOS health status. This function should return `true` if health is GREEN/YELLOW, and `false` if health is RED.

## 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: Add new route definitions.
*   `controllers/builder-control-plane-controller.js` (or similar existing controller): Implement `recordBuildStart` and `recordBuildComplete` methods.
*   `services/builder-control-plane-service.js` (or similar existing service): Implement `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` methods.
*   `models/build_record.js` (or similar existing model): Ensure the necessary schema/methods exist for persisting build start/complete data.

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   Verify `builderControlPlaneService.recordBuildStart` correctly persists data.
    *   Verify `builderControlPlaneService.recordBuildComplete` correctly persists data.
    *   Verify `builderControlPlaneService.canMarkBuildDone` returns `true`/`false` based on simulated health states.
    *   Verify `builderControlPlaneController.recordBuildComplete` returns 409 when `canMarkBuildDone` is false.
*   **Integration Tests (API):**
    *   `POST /build/start` with valid payload returns 200/201 and data is recorded.
    *   `POST /build/start` with invalid payload returns 400.
    *   `POST /build/complete` with valid payload returns 200/201 and data is recorded (when health is not RED).
    *   `POST /build/complete` with valid payload returns 409 when `canMarkBuildDone` indicates RED health.
    *   `POST /build/complete` with invalid payload returns 400.
*   **Database Inspection:** After successful API calls, directly query the database to confirm that `