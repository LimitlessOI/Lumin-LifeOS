<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G653 100. -->

Amendment 46: BuilderOS Control Plane Proof - G653-100

Proof-Closing Blueprint Note

This document addresses the implementation and proof gap for integrating BuilderOS build lifecycle signals into the LifeOS Council control plane. The primary objective is to establish robust API endpoints for recording the start and completion of BuilderOS-governed build processes, including a critical health-based pre-condition for build completion.

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` file lacks the necessary POST endpoints to capture BuilderOS build lifecycle events. Specifically:
-   A `/build/start` endpoint to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
-   A `/build/complete` endpoint to trigger `recordBuildComplete` with a build token and OIL receipt IDs.
-   Integration of a `canMarkBuildDone` health check before allowing `recordBuildComplete`, returning a 409 conflict if the system health is RED.

**2. Smallest Safe Build Slice to Close It:**
Implement the two specified POST routes within `routes/lifeos-council-builder-routes.js`. These routes will call corresponding internal service functions (e.g., from a `builderService` module) to handle the business logic and data persistence. The `/build/complete` route must include a conditional check against a `canMarkBuildDone` function, which will determine if the build can be marked complete based on system health.

**3. Exact Safe-Scope Files to Touch First:**
-   `routes/lifeos-council-builder-routes.js`: Add the new POST endpoints.
-   `services/builder-service.js` (inferred): Implement/expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.

**4. Verifier/Runtime Checks:**
-   **Verifier Check 1 (Start):** Send `POST /build/start` with `{ "task_id": "test-task-123", "blueprint_id": "bp-46", "model_used": "g653-100" }`. Expected: HTTP 202 Accepted or 200 OK. Verify `recordBuildStart` is invoked internally with correct parameters.
-   **Verifier Check 2 (Complete - Green Health):** Send `POST /build/complete` with `{ "token": "build-token-xyz", "oil_receipt_ids": ["oil-1", "oil-2"] }`. Ensure `canMarkBuildDone` returns true (simulating GREEN health). Expected: HTTP 202 Accepted or 200 OK. Verify `recordBuildComplete` is invoked internally with correct parameters.
-   **Verifier Check 3 (Complete - Red Health):** Send `POST /build/complete` with `{ "token": "build-token-abc", "oil_receipt_ids": ["oil-3"] }`. Ensure `canMarkBuildDone` returns false (simulating RED health). Expected: HTTP 409 Conflict. Verify `recordBuildComplete` is *not* invoked.
-   **Runtime Check:** Monitor logs for successful invocation of `recordBuildStart` and `recordBuildComplete` and appropriate error handling for 409 cases. Observe database entries for new build records.

**5. Stop Conditions if Runtime Truth Disagrees:**
-   If `POST /build/start` or `POST /build/complete` do not return the expected HTTP status codes (200/202 for success, 409 for conflict).
-   If internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are not called or are called with incorrect parameters.
-   If the 409 conflict is not correctly triggered when `canMarkBuildDone` indicates RED health.
-   If build lifecycle events are not correctly persisted or reflected in the BuilderOS state.