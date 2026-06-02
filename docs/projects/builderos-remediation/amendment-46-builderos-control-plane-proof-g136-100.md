# Amendment 46: BuilderOS Control Plane Proof - G136-100

## Proof-Closing Blueprint Note: Builder Control Plane Wiring

This note addresses the implementation gap for wiring the BuilderOS control plane actions into `routes/lifeos-council-builder-routes.js`, as specified in Amendment 46. The goal is to establish robust build lifecycle tracking and state management within the BuilderOS-governed loop.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated POST endpoints within `routes/lifeos-council-builder-routes.js` to signal the start and completion of a build process. Specifically:
*   A `POST /build/start` endpoint to record the initiation of a build, capturing `task_id`, `blueprint_id`, and `model_used`.
*   A `POST /build/complete` endpoint to record the successful or failed completion of a build, requiring a build `token` and `OIL receipt IDs`.
*   Integration of a health check (`canMarkBuildDone`) before marking a build complete, returning a `409 Conflict` if the system health is RED and prevents completion.

These endpoints are crucial for the BuilderOS control plane to maintain an accurate state of ongoing and completed builds, enabling proper resource allocation, progress tracking, and error handling.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST handlers to the existing `routes/lifeos-council-builder-routes.js` file. These handlers will:
1.  Parse incoming request bodies for the required build parameters.
2.  Call internal BuilderOS service functions (`recordBuildStart`, `recordBuildComplete`).
3.  Implement the conditional check for `canMarkBuildDone` before `recordBuildComplete`.
4.  Return appropriate HTTP status codes (200 OK, 400 Bad Request for missing params, 409 Conflict for health issues, 500 Internal Server Error for service failures).

This slice focuses solely on the routing and initial service call integration, assuming the underlying `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` service functions are either already implemented or will be implemented in a subsequent, parallel build slice.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new POST routes and their respective handlers.
*   `services/builder-control-plane-service.js` (or similar existing builder service): This file is the logical place to implement or expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If it doesn't exist, a new service file would be created. For this build slice, we assume these functions are importable from an existing or soon-to-be-created service.

### 4. Verifier/Runtime Checks

*   **Build Start Verification**:
    *   Send a `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, `model_used`.
    *   Verify the API returns `200 OK`.
    *   Check the BuilderOS internal build state/database to confirm a new build record has been created with the correct initial status and metadata.
*   **Build Complete Verification (Success Path)**:
    *   Send a `POST` request to `/build/complete` with a valid `token` and `OIL receipt IDs` (for an existing, started build).
    *   Ensure `canMarkBuildDone` is configured to return `true` (e.g., by simulating a GREEN health state).
    *   Verify the API returns `200 OK`.
    *   Check the BuilderOS internal build state/database to confirm the build record is updated to a 'completed' status with the associated receipt IDs.
*   **Build Complete Verification (Health RED Path)**:
    *   Send a `POST` request to `/build/complete` with a valid `token` and `OIL receipt IDs`.
    *   Ensure `canMarkBuildDone` is configured to return `false` (e.g., by simulating a RED health state).
    *   Verify the API returns `409 Conflict`.
    *   Check the BuilderOS internal build state/database to confirm the build record's status has *not* been updated to 'completed'.
*   **Error Handling Verification**:
    *   Send requests with missing or invalid parameters to both `/build/start` and `/build/complete`.
    *   Verify the API returns `400 Bad Request` with an informative error message.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `POST /build/start` does not create a build record or returns an unexpected status code.
*   If `POST /build/complete` does not update the build record to 'completed' when `canMarkBuildDone` is `true`.
*   If `POST /build/complete` updates the build record to 'completed' when `canMarkBuildDone` is `false` (i.e., the 409 condition is bypassed).
*   If `POST /build/complete` does not return `409 Conflict` when `canMarkBuildDone` is `false`.
*   If any endpoint returns a `500 Internal Server Error` for valid inputs, indicating a deeper service integration issue.