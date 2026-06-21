<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G134 100. -->

Amendment 46 BuilderOS Control Plane Proof - G134-100

This document closes the proof gap identified in Amendment 46 regarding the BuilderOS control plane, specifically the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`. This note provides the necessary details for the next C2 build pass to implement the required functionality.

### 1. Exact Missing Implementation or Proof Gap

The current `routes/lifeos-council-builder-routes.js` lacks the necessary endpoints and internal calls to properly track the BuilderOS build lifecycle and enforce health-based completion constraints. Specifically:
-   No `POST /build/start` endpoint to record the initiation of a build.
-   No `POST /build/complete` endpoint to record the successful completion of a build.
-   Missing integration with `canMarkBuildDone` for health-gated build completion, including the 409 conflict response.

### 2. Smallest Safe Build Slice to Close It

Implement two new POST endpoints within `routes/lifeos-council-builder-routes.js`:
-   `POST /build/start`: Accepts `task_id`, `blueprint_id`, and `model_used` in the request body. Calls an internal `recordBuildStart` function.
-   `POST /build/complete`: Accepts a `token` and `OIL receipt IDs` (e.g., `oil_receipt_ids` array) in the request body. Before calling `recordBuildDone`, it must invoke `canMarkBuildDone`. If `canMarkBuildDone` returns false, respond with a 409 Conflict status. Otherwise, proceed to call `recordBuildComplete`.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their corresponding handler logic.
-   `services/builder-control-plane.js` (ASSUMPTION): This file is assumed to contain (or will contain) the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. Imports will be added to `routes/lifeos-council-builder-routes.js` for these functions.

### 4. Verifier/Runtime Checks

-   **Endpoint Reachability:** Verify `POST /build/start` and `POST /build/complete` are accessible and respond correctly (e.g., 200 OK for success, 409 for conflict).
-   **`recordBuildStart` Invocation:** Send a `POST /build/start` request with valid `task_id`, `blueprint_id`, `model_used`. Verify that `recordBuildStart` is called with the correct parameters and that the build start event is logged/recorded in the BuilderOS control plane.
-   **`canMarkBuildDone` Gating:**
    -   Simulate a "RED" health state where `canMarkBuildDone` would return `false`. Send a `POST /build/complete` request. Verify the response is `409 Conflict`.
    -   Simulate a "GREEN" health state where `canMarkBuildDone` would return `true`. Send a `POST /build/complete` request. Verify the response is `200 OK` (or appropriate success code).
-   **`recordBuildComplete` Invocation:** After a successful `POST /build/complete` (health GREEN), verify that `recordBuildComplete` is called with the correct `token` and `OIL receipt IDs` and that the build completion event is logged/recorded in the BuilderOS control plane.
-   **Data Integrity:** Confirm that build lifecycle states in the BuilderOS control plane accurately reflect the events triggered by these routes.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes.
-   If `recordBuildStart` or `recordBuildComplete` are not invoked, or are invoked with incorrect parameters, despite successful route calls.
-   If the `409 Conflict` response is not returned when `canMarkBuildDone` indicates a RED health state.
-   If build lifecycle events are not accurately reflected in the BuilderOS control plane's state.
-   If any changes introduce regressions or side effects in other BuilderOS or LifeOS functionalities, violating the "Do not modify LifeOS user features or TSOS customer-facing surfaces" constraint.