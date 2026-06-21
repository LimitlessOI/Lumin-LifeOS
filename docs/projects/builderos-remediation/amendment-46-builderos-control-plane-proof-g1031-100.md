<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G1031 100. -->

Amendment 46 BuilderOS Control Plane Proof - G1031-100
Proof-Closing Blueprint Note: Builder Control Plane Route Wiring

This document outlines the necessary implementation to wire the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as per Amendment 46, focusing on build start and completion signals, including health checks.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of wired routes within `routes/lifeos-council-builder-routes.js` to handle BuilderOS control plane signals for build start and completion. Specifically:
-   A `POST` endpoint for `/build/start` to initiate build recording.
-   A `POST` endpoint for `/build/complete` to finalize build recording, including health checks and conditional error responses.
-   Integration of `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to:
-   Define a `POST /build/start` route that calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   Define a `POST /build/complete` route that:
    -   Checks system health and calls `canMarkBuildDone`.
    -   If `canMarkBuildDone` fails when health is RED, returns a 409 Conflict.
    -   Otherwise, calls `recordBuildComplete` with `token` and `OIL receipt IDs`.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will contain the new route definitions and their associated logic calls.
-   (Implicitly) Relevant service/utility files that export `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` if they are not defined inline or imported from a common library. For this proof, we assume these functions are available for import or defined within the scope of the route handler.

### 4. Verifier/Runtime Checks

-   **Route Accessibility:**
    -   `POST /build/start` with valid payload returns 200/202.
    -   `POST /build/complete` with valid payload returns 200/202.
-   **Build Start Logic:**
    -   Verify `recordBuildStart` is invoked with `task_id`, `blueprint_id`, and `model_used` from the request body.
    -   Check logs for successful build start recording.
-   **Build Complete Logic:**
    -   Verify `recordBuildComplete` is invoked with `token` and `OIL receipt IDs` from the request body.
    -   Check logs for successful build completion recording.
-   **Health Check & Conflict Handling:**
    -   Simulate a RED health state and a failing `canMarkBuildDone` condition for `POST /build/complete`. Verify a 409 Conflict response is returned.
    -   Simulate a GREEN health state or a successful `canMarkBuildDone` condition. Verify a 200/202 response is returned.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` or `POST /build/complete` routes are not reachable or return unexpected HTTP status codes (e.g., 404, 500).
-   If `recordBuildStart` or `recordBuildComplete` are not called, or are called with incorrect or missing parameters.
-   If the 409 Conflict response is not correctly triggered when `canMarkBuildDone` fails under RED health conditions.
-   If the implementation introduces any regressions or unintended side effects on LifeOS user features or TSOS customer-facing surfaces, violating the core specification.
-   If the system fails to record build start/completion events accurately in the underlying data store.