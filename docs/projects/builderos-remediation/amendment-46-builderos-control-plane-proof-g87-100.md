<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G87 100. -->

Amendment 46 BuilderOS Control Plane Proof - G87-100

Blueprint Note: Closing Proof Gap for BuilderOS Control Plane Wiring

This document details the implementation plan to close the proof gap identified in Amendment 46, specifically regarding the wiring of BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`.

### 1. Exact Missing Implementation or Proof Gap

The proof gap lies in the incomplete wiring of the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js`. Specifically, the following routes and their associated logic are missing:
-   A `POST` endpoint for `/build/start` that internally calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST` endpoint for `/build/complete` that internally calls `recordBuildComplete` with `token` and `OIL receipt IDs`.
-   The `/build/complete` endpoint must also include a check using `canMarkBuildDone` and return a `409 Conflict` status if this check fails when the system health is RED.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding the necessary route definitions and their corresponding asynchronous handler functions to `routes/lifeos-council-builder-routes.js`. This will include:
-   Importing `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` from their respective utility/service modules.
-   Defining two new `router.post` handlers for `/build/start` and `/build/complete`.
-   Implementing the logic within these handlers to parse request bodies, call the internal functions, and handle responses, including the 409 condition for `/build/complete`.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js` (primary modification target)
-   (Implicit) `services/builder-control-plane.js` or similar, where `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are assumed to be defined and exported. No direct modification to these files is planned in this slice, only their consumption.

### 4. Verifier/Runtime Checks

-   **Unit/Integration Tests:**
    -   Verify `POST /build/start` with valid payload successfully invokes `recordBuildStart` and returns a 200/202 status.
    -   Verify `POST /build/complete` with valid payload successfully invokes `recordBuildComplete` and returns a 200/202 status.
    -   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` returns `false` (simulating RED health).
    -   Verify `POST /build/complete` returns a success status when `canMarkBuildDone` returns `true`.
-   **Runtime Monitoring:**
    -   Observe BuilderOS control plane logs for successful `recordBuildStart` and `recordBuildComplete` invocations.
    -   Monitor API gateway logs for `2xx` responses on successful build events and `409` responses when `canMarkBuildDone` fails.
    -   Verify that `task_id`, `blueprint_id`, `model_used`, `token`, and `OIL receipt IDs` are correctly passed to the internal functions.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 500 errors, 404 not found).
-   If `recordBuildStart` or `recordBuildComplete` are not invoked as expected, or if they receive incorrect parameters.
-   If the `409 Conflict` response is not consistently returned when `canMarkBuildDone` indicates a failure condition (RED health).
-   If the system exhibits any regressions in existing BuilderOS or LifeOS functionality after deployment of this change.
-   If `canMarkBuildDone` cannot be reliably imported or invoked, or if its behavior is inconsistent with expectations.