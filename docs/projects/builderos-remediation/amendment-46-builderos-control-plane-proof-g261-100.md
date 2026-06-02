# Amendment 46: BuilderOS Control Plane Proof - G261-100

## Proof-Closing Blueprint Note: BuilderOS Control Plane Route Wiring

This document outlines the implementation plan and verification steps for wiring the BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js`, as per Amendment 46. This is an implementation-first plan for the next C2 build pass.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to signal the start and completion of a BuilderOS build process. Specifically:
-   A `POST /build/start` endpoint to record the initiation of a build task.
-   A `POST /build/complete` endpoint to record the successful or failed completion of a build task, including a critical health check (`canMarkBuildDone`) that can block completion.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
a.  **Route Definition:** Adding two new POST routes to `routes/lifeos-council-builder-routes.js`.
b.  **Controller Logic:** Implementing or integrating placeholder functions for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` within `controllers/lifeos-council-builder-controller.js`.
c.  **Health Check Integration:** Ensuring `canMarkBuildDone` accurately reflects the BuilderOS health status (e.g., RED for critical issues) and triggers a 409 conflict response when health is RED.

### 3. Exact Safe-Scope Files to Touch First

1.  `routes/lifeos-council-builder-routes.js`: To define the new API endpoints.
2.  `controllers/lifeos-council-builder-controller.js`: To house the business logic for build start/complete and the `canMarkBuildDone` check.
3.  `services/builder-health-service.js` (or similar existing health service): To provide the underlying health status for `canMarkBuildDone`. (Assumption: A dedicated service exists or will be created for BuilderOS health.)

### 4. Verifier/Runtime Checks

Upon deployment, the following checks must pass:

*   **`POST /build/start` Functionality:**
    *   Send a `POST` request to `/build/start` with `{ task_id: '...', blueprint_id: '...', model_used: '...' }`.
    *   Verify a `200 OK` or `204 No Content` response.
    *   Verify that `recordBuildStart` is invoked with the correct payload and that the build start event is logged/persisted in the BuilderOS internal system.
*   **`POST /build/complete` (Health GREEN) Functionality:**
    *   Ensure BuilderOS health is GREEN (i.e., `canMarkBuildDone` returns true).
    *   Send a `POST` request to `/build/complete` with `{ token: '...', oil_receipt_ids: ['...', '...'] }`.
    *   Verify a `200 OK` or `204 No Content` response.
    *   Verify that `recordBuildComplete` is invoked with the correct payload and that the build completion event is logged/persisted.
*   **`POST /build/complete` (Health RED) Functionality:**
    *   Artificially set BuilderOS health to RED (i.e., `canMarkBuildDone` returns false).
    *   Send a `POST` request to `/build/complete` with `{ token: '...', oil_receipt_ids: ['...', '...'] }`.
    *   Verify a `409 Conflict` response is returned.
    *   Verify that `recordBuildComplete` is *not* invoked when `canMarkBuildDone` fails.
*   **Isolation:** Confirm no regressions or unintended side effects on LifeOS user features or TSOS customer-facing surfaces.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass must be halted and rolled back if any of the following conditions are met:

*   **Functional Failure:**