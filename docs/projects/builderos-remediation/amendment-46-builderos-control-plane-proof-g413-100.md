Amendment 46 BuilderOS Control Plane Proof - G413-100

This document outlines the proof-closing steps for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as per Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file is missing the complete implementation for the BuilderOS control plane endpoints:
-   A `POST /build` route to initiate a build, calling `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST /build/complete` route to finalize a build, calling `recordBuildComplete` with `token` and `OIL receipt IDs`.
-   Error handling for `POST /build/complete` to return a `409 Conflict` if `canMarkBuildDone` fails when the system health is RED.

### 2. Smallest Safe Build Slice to Close It

Implement the two new POST routes in `routes/lifeos-council-builder-routes.js`.
-   For `/build` start: Add a handler that extracts `task_id`, `blueprint_id`, and `model_used` from the request body and calls the internal `recordBuildStart` function.
-   For `/build` complete: Add a handler that extracts `token` and `OIL receipt IDs` from the request body. Before calling `recordBuildComplete`, check `canMarkBuildDone`. If `canMarkBuildDone` returns false and system health is RED, respond with 409. Otherwise, call `recordBuildComplete`.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and handlers.
-   `src/services/build-control-service.js` (assumed): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly implemented and exposed for import.

### 4. Verifier/Runtime Checks

-   **Route Accessibility:**
    -   `POST /build` returns `200 OK` or `202 Accepted` on successful build start request.
    -   `POST /build/complete` returns `200 OK` or `202 Accepted` on successful build completion request.
-   **Internal Function Calls:**
    -   Verify `recordBuildStart` is invoked with correct `task_id`, `blueprint_id`, `model_used` parameters on `/build` POST.
    -   Verify `recordBuildComplete` is invoked with correct `token` and `OIL receipt IDs` on `/build/complete` POST (when `canMarkBuildDone` passes).
-   **Error Handling:**
    -   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` fails and system health is RED.
    -   Verify appropriate logging for all successful and failed operations.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 404, 500 for valid requests).
-   If `recordBuildStart` or `recordBuildComplete` are not called, or are called with incorrect parameters, as observed in logs or tracing.
-   If the `409 Conflict` response is not consistently returned when `canMarkBuildDone` fails under RED health conditions.
-   If the system health check mechanism (used by `canMarkBuildDone`) is found to be unreliable or misreporting.