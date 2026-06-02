# Amendment 46: BuilderOS Control Plane Proof - G191-100

## Proof-Closing Blueprint Note: Builder Control Plane Wiring

This note addresses the implementation gap for wiring the BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to signal the start and completion of a build process, along with the necessary internal service calls and error handling for build completion. Specifically:

*   **Missing Route Definitions:** `POST /build/start` and `POST /build/complete` are not defined.
*   **Missing Controller Logic:** Functions to handle these routes, orchestrate internal service calls (`recordBuildStart`, `recordBuildComplete`), and implement the `canMarkBuildDone` health check are not present.
*   **Missing Service Logic:** The internal `builderService` methods (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) and their interaction with a system health service are not fully implemented or exposed.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:

1.  **Route Definition:** Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`.
2.  **Controller Implementation:** Creating or extending `controllers/builderController.js` with `startBuild` and `completeBuild` methods.
3.  **Service Implementation:** Creating or extending `services/builderService.js` with `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` methods, including a dependency on a `healthService`.

This slice focuses solely on the BuilderOS control plane, avoiding any modifications to LifeOS user features or TSOS customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`
*   `controllers/builderController.js` (create if not exists, extend if exists)
*   `services/builderService.js` (create if not exists, extend if exists)
*   `services/healthService.js` (ensure `getSystemHealth` or similar exists/is mockable)

### 4. Verifier/Runtime Checks

**Unit Tests:**
*   `builderController.js`:
    *   `startBuild` calls `builderService.recordBuildStart` with correct payload.
    *   `completeBuild` calls `builderService.recordBuildComplete` with correct payload.
    *   `completeBuild` calls `builderService.canMarkBuildDone`.
    *   `completeBuild` returns 409 when `canMarkBuildDone` fails and health is RED.
    *   `completeBuild` returns 200/201 when `canMarkBuildDone` passes or health is not RED.
*   `builderService.js`:
    *   `recordBuildStart` correctly processes and persists build start data.
    *   `recordBuildComplete` correctly processes and persists build completion data.
    *   `canMarkBuildDone` returns `false` when `healthService.getSystemHealth()` is 'RED' and other conditions (if any) are met.
    *   `canMarkBuildDone` returns `true` otherwise.

**Integration Tests (via `