<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G149 100. -->

Blueprint Note: Amendment 46 BuilderOS Control Plane Proof - G149-100
This document outlines the proof-closing blueprint note for integrating BuilderOS control plane signals into the LifeOS Council Builder routes.

1. Exact Missing Implementation or Proof Gap:
The `routes/lifeos-council-builder-routes.js` file lacks the necessary endpoint implementations to:
- Handle `POST /build/start` to record the initiation of a build process, requiring `task_id`, `blueprint_id`, and `model_used`.
- Handle `POST /build/complete` to record the completion of a build process, requiring a build token and OIL receipt IDs.
- Implement a health check mechanism to prevent marking a build as complete (`/build/complete`) if `canMarkBuildDone` indicates a RED health status, returning a 409 Conflict.

2. Smallest Safe Build Slice to Close It:
Implement two new POST endpoints within `routes/lifeos-council-builder-routes.js`:
- `/build/start`: Extract `task_id`, `blueprint_id`, `model_used` from the request body and call `recordBuildStart`.
- `/build/complete`: Extract build token and OIL receipt IDs from the request body. Before calling `recordBuildComplete`, invoke `canMarkBuildDone`. If it returns false (indicating RED health), respond with a 409 status. Otherwise, proceed to call `recordBuildComplete`.
Assume `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are available as imported utility functions or methods from an existing build control service.

3. Exact Safe-Scope Files to Touch First:
- `routes/lifeos-council-builder-routes.js`: Add the new POST route definitions and their respective handler logic.
- `services/build-control-service.js` (or similar existing service): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly implemented and exposed for import. (Assuming these functions are not yet fully implemented or need minor adjustments to support the new route requirements).

4. Verifier/Runtime Checks:
- **Unit Tests:**
    - Verify `POST /build/start` calls `recordBuildStart` with the correct payload.
    - Verify `POST /build/complete` calls `recordBuildComplete` with the correct token and OIL receipt IDs when `canMarkBuildDone` is true.
    - Verify `POST /build/complete` returns 409 when `canMarkBuildDone` is false (RED health).
- **Integration Tests:**
    - Deploy the updated `routes/lifeos-council-builder-routes.js` and send requests to `/build/start` and `/build/complete`.
    - Monitor internal logs and database entries to confirm build start and completion records are accurately created and updated.
    - Simulate a RED health state for `canMarkBuildDone` and confirm the `/build/complete` endpoint responds with a 409.
- **OIL Verifier:** Confirm the verifier successfully processes this markdown file as documentation without attempting to execute it as code.

5. Stop Conditions if Runtime Truth Disagrees:
- If `recordBuildStart` or `recordBuildComplete` fail to persist build state correctly.
- If the `/build/complete` endpoint does not consistently return a 409 status when `canMarkBuildDone` indicates a RED health state.
- If the new routes introduce unexpected latency or errors in the BuilderOS control plane.
- If the OIL verifier continues to reject this documentation file due to "syntax errors" (indicating a fundamental issue with the verifier's processing of documentation files, requiring a separate remediation).