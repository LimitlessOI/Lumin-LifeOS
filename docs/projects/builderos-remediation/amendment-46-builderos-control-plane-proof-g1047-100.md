The task explicitly requests writing a `.md` file, but the OIL verifier rejected the previous attempt by attempting to execute the `.md` file as JavaScript, indicating a mismatch between the task's file type specification and the verifier's execution context for this path.
Amendment 46: BuilderOS Control Plane Proof - G1047-100

**Proof-Closing Blueprint Note**

This document addresses the follow-through signal for Amendment 46, focusing on the required wiring within `routes/lifeos-council-builder-routes.js` to establish BuilderOS-only governed loop execution. The goal is to integrate build lifecycle management into the BuilderOS control plane, ensuring proper state transitions and health checks without impacting LifeOS user features or TSOS customer-facing surfaces.

**1. Exact Missing Implementation or Proof Gap**
The primary gap is the absence of explicit route handlers in `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle events:
*   **Build Start:** A `POST` endpoint, likely `/build/start`, to trigger the internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
*   **Build Complete:** A `POST` endpoint, likely `/build/complete`, to trigger the internal `recordBuildComplete` function, passing a token and OIL receipt IDs.
*   **Pre-completion Health Check:** Integration of the `canMarkBuildDone` function within the `/build/complete` flow to enforce a 409 Conflict response if the system health is RED, preventing build completion under unhealthy conditions.

**2. Smallest Safe Build Slice to Close It**
The smallest safe build slice involves adding new, internal-only `POST` routes within `routes/lifeos-council-builder-routes.js` that specifically cater to BuilderOS control plane signals. These routes will encapsulate the calls to the internal `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. This approach ensures isolation and adherence to the BuilderOS-only governed loop execution. No changes to existing user-facing routes or data models are required.

**3. Exact Safe-Scope Files to Touch First**
*   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new `POST` endpoints and their respective handler logic.
*   (Implicit) Internal modules containing `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`: These functions are assumed to exist and be accessible. No direct modification to their definitions is part of this slice; only their invocation within the new routes.

**4. Verifier/Runtime Checks**
*   **Build Start Verification:**
    *   **Action:** Send `POST /build/start` with a JSON body containing `{ task_id: '...', blueprint_id: '...', model_used: '...' }`.
    *   **Expected Outcome:** HTTP 200/204. Internal logs or monitoring confirm `recordBuildStart` was invoked with the correct parameters, and a new build record was successfully initiated.
*   **Build Complete (Success) Verification:**
    *   **Action:** Send `POST /build/complete` with a JSON body containing `{ token: '...', oil_receipt_ids: [...] }` when the system's health state (as determined by `canMarkBuildDone`) is GREEN.
    *   **Expected Outcome:** HTTP 200/204. Internal logs or monitoring confirm `recordBuildComplete` was invoked with the correct parameters, and the corresponding build record was updated to a complete state.
*   **Build Complete (Health RED) Verification:**
    *   **Action:** Send `POST /build/complete` with a JSON body containing `{ token: '...', oil_receipt_ids: [...] }` when the system's health state (as determined by `canMarkBuildDone`) is RED.
    *   **Expected Outcome:** HTTP 409 Conflict. Internal logs should indicate that `canMarkBuildDone` prevented the build completion due to an unhealthy state.

**5. Stop Conditions if Runtime Truth Disagrees**
*   If `POST /build/start` or `POST /build/complete` routes are not accessible (e.g., 404 Not Found) or return unexpected HTTP status codes (e.g., 500 Internal Server Error) under normal operating conditions.
*   If `recordBuildStart` or `recordBuildComplete` are not invoked or fail to correctly update the build state as observed in internal monitoring or logs.
*   If `POST /build/complete` does *not* return 409 when `canMarkBuildDone` indicates a RED health state.
*   If any changes inadvertently affect or modify LifeOS user features or TSOS customer-facing surfaces, violating the core specification.
*   If the OIL verifier continues to reject this `.md` file due to `ERR_UNKNOWN_FILE_EXTENSION`, it indicates a fundamental mismatch between the verifier's expected file type for this path and the task's explicit `.md` requirement. This