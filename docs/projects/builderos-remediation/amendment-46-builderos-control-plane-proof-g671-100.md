Amendment 46: BuilderOS Control Plane Proof - G671-100

Proof-Closing Blueprint Note

This document addresses the signal requiring follow-through for Amendment 46, specifically the wiring of `routes/lifeos-council-builder-routes.js` to integrate with the BuilderOS control plane.

The previous attempt resulted in a verifier rejection due to an `ERR_UNKNOWN_FILE_EXTENSION` when attempting to execute the `.md` file as code. This indicates the blueprint note should describe the implementation steps and proof, not contain executable code directly.

1.  **Exact Missing Implementation or Proof Gap**
    The core gap is the absence of the BuilderOS control plane route handlers and their underlying service logic within the `lifeos-council-builder-routes.js` file and associated services. Specifically:
    *   **Route Definitions:** The `POST /build/start` and `POST /build/complete` routes are not yet defined in `routes/lifeos-council-builder-routes.js`.
    *   **`recordBuildStart` Function:** A service function to record the initiation of a build, accepting `task_id`, `blueprint_id`, and `model_used`, is not implemented or integrated.
    *   **`recordBuildComplete` Function:** A service function to record the completion of a build, accepting a token and OIL receipt IDs, is not implemented or integrated.
    *   **`canMarkBuildDone` Function:** A health check or status function to determine if a build can be marked complete, especially considering a 'RED' health state, is not implemented or integrated.
    *   **Error Handling:** The logic to return a 409 status code when `canMarkBuildDone` fails during a 'RED' health state is missing from the `/build/complete` route handler.

2.  **Smallest Safe Build Slice to Close It**
    The implementation can be sliced into the following atomic units:
    *   **Service Layer:**
        *   Create/update `services/builder-control-plane-service.js` to export `recordBuildStart` and `recordBuildComplete` functions. These functions will handle data persistence (e.g., to a `build_records` table) and any necessary internal state updates.
        *   Create/update `services/builder-health-service.js` to export `canMarkBuildDone` which checks the current BuilderOS health status and other relevant conditions.
    *   **Route Layer:**
        *   Modify `routes/lifeos-council-builder-routes.js` to import the new service functions.
        *   Add a `POST /build/start` route handler that calls `recordBuildStart`.
        *   Add a `POST /build/complete` route handler that first calls `canMarkBuildDone`. If `canMarkBuildDone` returns false (especially if health is RED), return a 409 status. Otherwise, call `recordBuildComplete`.

3.  **Exact Safe-Scope Files