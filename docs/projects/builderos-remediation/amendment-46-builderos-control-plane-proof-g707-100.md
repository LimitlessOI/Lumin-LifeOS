<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G707 100. -->

Amendment 46: BuilderOS Control Plane Proof - G707-100

This document outlines the proof-closing blueprint note for wiring the BuilderOS control plane within `routes/lifeos-council-builder-routes.js`, addressing the signal requiring follow-through for build start/complete operations and health-based build completion restrictions.

### 1. Exact Missing Implementation / Proof Gap

The core gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle events (`start` and `complete`) and enforce health-based completion constraints. Specifically:
-   **`/build/start` (POST):** Lacks an endpoint to internally record the initiation of a build, requiring `task_id`, `blueprint_id`, and `model_used`.
-   **`/build/complete` (POST):** Lacks an endpoint to internally record the completion of a build, requiring a `token` and `OIL receipt IDs`. This endpoint also needs to integrate a health check via `canMarkBuildDone` and return a `409 Conflict` if the system health is RED.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves extending `routes/lifeos-council-builder-routes.js` with two new POST endpoints and their associated logic:
-   **Route Definition:** Add `POST /build/start` and `POST /build/complete`.
-   **Internal Function Calls:** Implement calls to `recordBuildStart({ task_id, blueprint_id, model_used })` for build start and `recordBuildComplete(token, oilReceiptIDs)` for build complete.
-   **Health Check Integration:** For `/build/complete`, integrate a check using `canMarkBuildDone()`. If it returns `false` (indicating RED health), respond with `409 Conflict`. Otherwise, proceed with `recordBuildComplete`.
-   **Dependency Imports:** Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly imported from their respective internal modules.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their handler logic.
-   `src/builder/services/build-lifecycle-manager.js` (assumed path for internal functions): This file (or similar) is expected to export `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.

### 4. Verifier / Runtime Checks

-   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
    -   Verify `POST /build/start` successfully invokes `recordBuildStart` with the correct payload (`task_id`, `blueprint_id`, `model_used`).
    -   Verify `POST /build/complete` successfully invokes `recordBuildComplete` with the correct `token` and `OIL receipt IDs` when `canMarkBuildDone` is true.
    -   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` is false (health RED).
    -   Verify `POST /build/complete` returns `200 OK` when `canMarkBuildDone` is true.
-   **Integration Tests:**
    -   Simulate a full build lifecycle: call `/build/start`, then `/build/complete`, and verify the state transitions in the BuilderOS control plane.
    -   Test the `/build/complete` endpoint under simulated RED health conditions to confirm the `409` response.
-   **Runtime Monitoring:**
    -   Observe application logs for successful invocations of `recordBuildStart` and `recordBuildComplete`.
    -   Monitor HTTP response codes for `/build/complete` in production, specifically looking for expected `200`s and `409`s under varying health conditions.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` or `recordBuildComplete` are not being called or are called with incorrect parameters.
-   If the `/build/complete` endpoint does not return `409 Conflict` when `canMarkBuildDone` indicates RED health, or returns `409` when health is GREEN.
-   If the new routes introduce unexpected side effects or regressions in other BuilderOS functionalities.
-   If the implementation violates the `BuilderOS-only governed loop execution` or modifies `LifeOS user features or TSOS customer-facing surfaces`.