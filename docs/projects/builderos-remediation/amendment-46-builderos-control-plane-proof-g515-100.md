<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G515 100. -->

Amendment 46: BuilderOS Control Plane Proof - G515-100
Proof-Closing Blueprint Note

This document outlines the implementation plan and verification steps for wiring the BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js` as per Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build process. Specifically, the routes for initiating a build (`/build` start) and completing a build (`/build` complete) are not wired, nor is the conditional 409 conflict response based on `canMarkBuildDone` and system health.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   **Route Definition:** Adding two new `POST` endpoints to `routes/lifeos-council-builder-routes.js`: one for build start and one for build completion.
*   **Build Start Handler:** Implementing a handler for `/build/start` that accepts `task_id`, `blueprint_id`, and `model_used` and calls an internal `recordBuildStart` function.
*   **Build Complete Handler:** Implementing a handler for `/build/complete` that accepts a token and OIL receipt IDs, calls an internal `recordBuildComplete` function, and incorporates the `canMarkBuildDone` check.
*   **Conflict Logic:** Integrating a check using `canMarkBuildDone()` and the system's health status to return a `409 Conflict` response if the build cannot be marked done.
*   **Internal Service Integration:** Ensuring the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly imported and invoked from an existing internal BuilderOS service module (e.g., `builderService`).

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new POST routes and their respective handlers.
*   `services/builder-service.js` (or similar existing internal service file): This file is assumed to contain or will be extended to contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. No new file creation is anticipated for these functions, adhering to the "extend what is there" principle.

### 4. Verifier/Runtime Checks

*   **API Endpoint Accessibility:**
    *   `POST /build/start`: Verify that a successful request with `task_id`, `blueprint_id`, `model_used` returns a `202 Accepted` or `200 OK` status and triggers `recordBuildStart`.
    *   `POST /build/complete`: Verify that a successful request with `token` and `oil_receipt_ids` returns a `202 Accepted` or `200 OK` status and triggers `recordBuildComplete`.
*   **Conflict Response:**
    *   Simulate a scenario where `canMarkBuildDone()` returns `false` while system health is RED. Verify that `POST /build/complete` returns a `409 Conflict` status.
    *   Simulate a scenario where `canMarkBuildDone()` returns `true` (or health is not RED) and verify `POST /build/complete` proceeds normally.
*   **Internal State Verification:**
    *   Monitor internal logs to confirm `recordBuildStart` and `recordBuildComplete` are invoked with correct parameters.
    *   Inspect the BuilderOS internal database to ensure new build records are created on `/build/start` and updated with completion details and OIL receipt IDs on `/build/complete`.
*   **Error Handling:** Test with malformed requests (missing required parameters) to ensure appropriate `400 Bad Request` responses.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Route Inaccessibility:** If the `/build/start` or `/build/complete` endpoints are not reachable or consistently return `500 Internal Server Error` for valid requests.
*   **Incorrect Status Codes:** If the endpoints return unexpected HTTP status codes (e.g., `200 OK` instead of `409 Conflict` when `canMarkBuildDone` fails, or vice-versa).
*   **Data Inconsistency:** If internal build records are not created or updated correctly in the database, or if OIL receipt IDs are not persisted.
*   **Regression:** If existing BuilderOS functionalities or other routes in `lifeos-council-builder-routes.js` are negatively impacted or exhibit unexpected behavior.
*   **Performance Degradation:** If the new routes introduce significant latency or resource consumption.