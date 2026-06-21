<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G1081 100. -->

### Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane - G1081-100

This note addresses the implementation gap identified in Amendment 46, specifically regarding the wiring of BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`.

#### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of specific POST endpoints within `routes/lifeos-council-builder-routes.js` to handle the lifecycle events of a BuilderOS build:
-   Initiation of a build (`/build/start`).
-   Completion of a build (`/build/complete`).
-   Pre-condition check for build completion based on system health (`canMarkBuildDone`).

These endpoints are crucial for the BuilderOS control plane to accurately track and manage build processes, ensuring operational integrity and preventing build completions under unhealthy system states.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST routes to `routes/lifeos-council-builder-routes.js` and integrating the necessary internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).

**Route 1: `POST /build/start`**
-   Accepts `task_id`, `blueprint_id`, `model_used` in the request body.
-   Calls `recordBuildStart` with these parameters.
-   Returns a success response (e.g., `200 OK` or `201 Created`).

**Route 2: `POST /build/complete`**
-   Accepts `token` and `oil_receipt_ids` in the request body.
-   Before calling `recordBuildComplete`, it must check `canMarkBuildDone()`.
-   If `canMarkBuildDone()` returns `false` (indicating health RED), it must return a `409 Conflict` status.
-   If `canMarkBuildDone()` returns `true`, it proceeds to call `recordBuildComplete` with the provided parameters.
-   Returns a success response (e.g., `200 OK`).

This slice focuses purely on the routing and immediate function calls, assuming the internal `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are either already implemented or will be implemented in a separate, dependent slice.

#### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This is the primary file for adding the new routes.
-   `services/builder-control-plane-service.js` (inferred): This file would likely house the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions, which need to be imported and used by the routes.

#### 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   Verify that `POST /build/start` correctly