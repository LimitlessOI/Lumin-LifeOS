ASSUMPTIONS:
- The functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are available for import from an existing BuilderOS service layer (e.g., `services/builder-control-plane.js`) or will be implemented there as part of the overall BuilderOS control plane.

Amendment 46 BuilderOS Control Plane Proof - G129-100
This document serves as a proof-closing blueprint note for the BuilderOS Control Plane, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js` as per Amendment 46.

1. Exact Missing Implementation or Proof Gap
The primary gap is the incomplete wiring of the `POST /build` endpoint within `routes/lifeos-council-builder-routes.js`. The current implementation lacks the necessary calls to internal BuilderOS control plane functions for recording build start and completion events, and for enforcing build completion health checks. Specifically:
    - `recordBuildStart({ task_id, blueprint_id, model_used })` is not called at the beginning of a build.
    - `recordBuildComplete` with `token` and `OIL receipt IDs` is not called upon build completion.
    - A check using `canMarkBuildDone` is not performed, and a 409 status is not returned if this check fails when the system health is RED.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves extending the existing `POST /build` handler in `routes/lifeos-council-builder-routes.js`. This extension will integrate the calls to `recordBuildStart` and `recordBuildComplete` at the appropriate lifecycle points, and introduce the `canMarkBuildDone` check with the specified 409 error response. This modification will be contained within the existing route handler logic, leveraging existing BuilderOS service functions.

3. Exact Safe-Scope Files to Touch First
    - `routes/lifeos-council-builder-routes.js`: Modify the `POST /build` handler.
    - `services/builder-control-plane.js` (or similar existing BuilderOS service file): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are properly exposed and implemented for import.

4. Verifier/Runtime Checks
    - **Unit Tests:**
        - Verify `POST /build` calls `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
        - Verify `POST /build` calls `recordBuildComplete` with `token` and `OIL receipt IDs` on success.
        - Verify `POST /build` returns 409 when `canMarkBuildDone` fails (e.g., health is RED).
        - Verify successful build completion returns the expected 2xx response.
    - **Integration Tests (Staging):**
        - Initiate a build via `/build` and confirm `record