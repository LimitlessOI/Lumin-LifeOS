<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G537 100. -->

Amendment 46 BuilderOS Control Plane Proof - G537-100

Proof-Closing Blueprint Note for `routes/lifeos-council-builder-routes.js` Wiring

This document addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` as specified in `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`.

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` file requires new POST endpoints to manage the BuilderOS loop state:
-   A `POST /build/start` endpoint to initiate a build record.
-   A `POST /build/complete` endpoint to finalize a build record and incorporate OIL receipt IDs.
-   Integration of a health check (`canMarkBuildDone`) within the `/build/complete` flow to prevent completion under specific conditions (e.g., health RED), returning a 409 conflict.

**2. Smallest Safe Build Slice to Close It:**
The implementation involves modifying `routes/lifeos-council-builder-routes.js` to:
-   Define a new `POST /build/start` route.
-   Define a new `POST /build/complete` route.
-   Implement or call an internal `recordBuildStart` function within the `/build/start` handler, accepting `{ task_id, blueprint_id, model_used }`.
-   Implement or call an internal `recordBuildComplete` function within the `/build/complete` handler, accepting `token` and `OIL receipt IDs`.
-   Before calling `recordBuildComplete`, invoke `canMarkBuildDone`. If `canMarkBuildDone` returns false (indicating RED health or similar blocking condition), immediately return a 409 HTTP status code.

**3. Exact Safe-Scope Files to Touch First:**
-   `routes/lifeos-council-builder-routes.js`: Primary file for route definition and handler logic.
-   `services/builder-control-service.js` (or similar existing builder-related service): To house or extend `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions, ensuring BuilderOS-only governance.

**4. Verifier/Runtime Checks:**
-   **Unit/Integration Tests:**
    -   Verify `POST /build/start` successfully invokes `recordBuildStart` with correct payload (`task_id`, `blueprint_id`, `model_used`).
    -   Verify `POST /build/complete` successfully invokes `recordBuildComplete` with correct payload (`token`, `OIL receipt IDs`) when `canMarkBuildDone` is true.
    -   Verify `POST /build/complete` returns HTTP 409 when `canMarkBuildDone` returns false (e.g., simulated RED health).
    -   Verify `POST /build/complete` returns HTTP 2xx (e.g., 200, 204) when `canMarkBuildDone` returns true.
-   **Runtime Monitoring:**
    -   Observe system logs for successful `recordBuildStart` and `recordBuildComplete` invocations during BuilderOS loop execution.
    -   Monitor network traffic and application logs for expected 409 responses from `/build/complete` under conditions where `canMarkBuildDone` should fail.
    -   Confirm BuilderOS loop progresses correctly through start and complete phases.

**5. Stop Conditions if Runtime Truth Disagrees:**
-   If `recordBuildStart` or `recordBuildComplete` are not called or fail to process their respective payloads during BuilderOS loop execution.
-   If `POST /build/complete` does not return a 409 status when `canMarkBuildDone` indicates a blocking condition (e.g., health RED).
-   If `POST /build/complete` returns a 409 status when `canMarkBuildDone` indicates a non-blocking condition (false positive).
-   If the BuilderOS control plane exhibits unexpected state transitions or failures directly attributable to the new route wiring.