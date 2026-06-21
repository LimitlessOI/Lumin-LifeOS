<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof - G1055-100 -->

# Amendment 46 BuilderOS Control Plane Proof - G1055-100

## Proof-Closing Blueprint Note for BuilderOS Control Plane Wiring

This document addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` as part of Amendment 46. It outlines the exact implementation gap, the smallest safe build slice to close it, the exact safe-scope files to touch first, verifier/runtime checks, and stop conditions if runtime truth disagrees. This note is implementation-first and ready for the next C2 build pass.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of the required `POST` endpoints within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle (start and complete), along with the associated internal logic for recording build states and enforcing completion conditions. Specifically:

*   **`/build/start` (POST):** Missing route to initiate a build, requiring `task_id`, `blueprint_id`, and `model_used` in the request body, and calling an internal `recordBuildStart` function.
*   **`/build/complete` (POST):** Missing route to finalize a build, requiring a token and OIL receipt IDs, calling an internal `recordBuildComplete` function, and conditionally returning a `409 Conflict` if `canMarkBuildDone` indicates a health RED state.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:

1.  Defining the new `POST` routes in `routes/lifeos-council-builder-routes.js`.
2.  Implementing or integrating the handler functions for these routes, which will orchestrate calls to the BuilderOS control plane service layer.
3.  Ensuring the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are accessible and correctly invoked by the route handlers. These functions are assumed to reside in a dedicated BuilderOS controller or service module.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: Add the new `POST /build/start` and `POST /build/complete` route definitions.
*   `controllers/builder-controller.js` (or similar existing BuilderOS controller/service file): Implement the handler functions for the new routes, including the logic for calling `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If `builder-controller.js` does not exist, a new file `controllers/builder-controller.js` would be created, or an existing relevant service file would be extended. For this pass, we assume `controllers/builder-controller.js` is the appropriate extension point.
*   `services/builder-control-plane.js` (or similar existing BuilderOS service file): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are defined and correctly implement their respective business logic (e.g., database interactions, health checks).

### 4. Verifier/Runtime Checks

To verify the implementation and ensure correct runtime behavior:

*   **Unit/Integration Tests:**
    *   Verify `POST /build/start` successfully calls `recordBuildStart` with correct parameters and returns a success status (e.g., 200/202).
    *   Verify `POST /build/complete` successfully calls `recordBuildComplete` with correct parameters and returns a success status (e.g., 200/202) when `canMarkBuildDone` is true.
    *   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` evaluates to false (health RED).
    *   Test error handling for missing or invalid parameters on both endpoints.
*   **Runtime Monitoring:**
    *   Monitor application logs for successful invocations of `recordBuildStart` and `recordBuildComplete`.
    *   Observe HTTP response codes for `/build/start` and `/build/complete` endpoints, specifically looking for expected 2xx and 409 responses.
    *   Confirm that build state transitions (start, complete) are accurately reflected in the underlying data store.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be halted and re-evaluated if any of the following conditions are met during verification or runtime:

*   `POST /build/start` or `POST /build/complete` endpoints are unreachable or return unexpected HTTP status codes (e.g., 5xx errors, 404 for valid routes).
*   `recordBuildStart` or `recordBuildComplete` functions are not invoked or fail silently, leading to unrecorded build states.
*   `POST /build/complete` returns a success status (2xx) when `canMarkBuildDone` indicates a health RED state, failing to enforce the 409 conflict.
*   `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone`