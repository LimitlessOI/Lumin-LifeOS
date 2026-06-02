Amendment 46: BuilderOS Control Plane Proof - G705-100
Proof-Closing Blueprint Note: Builder Control Plane Route Wiring

This note addresses the implementation gap for wiring the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

**1. Exact Missing Implementation or Proof Gap**
The primary gap is the incomplete wiring of the BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js`. Specifically:
*   **`/build/start` (POST):** Needs to be implemented to accept `task_id`, `blueprint_id`, and `model_used` in its body and call an internal `recordBuildStart` function with these parameters.
*   **`/build/complete` (POST):** Needs to be implemented to accept a `token` and `OIL receipt IDs` in its body and call an internal `recordBuildComplete` function. This endpoint must also incorporate a check using `canMarkBuildDone`. If `canMarkBuildDone` fails when the system health is RED, the endpoint must return a `409 Conflict` status.

**2. Smallest Safe Build Slice to Close It**
Implement the two new POST endpoints (`/build/start` and `/build/complete`) within `routes/lifeos-council-builder-routes.js`. This involves:
*   Adding route definitions for `POST /build/start` and `POST /build/complete`.
*   Implementing the handler for `/build/start` to parse the request body and invoke `recordBuildStart`.
*   Implementing the handler for `/build/complete` to parse the request body, invoke `recordBuildComplete`, and include the conditional `canMarkBuildDone` check for `409` response.
*   Ensuring `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are accessible (imported or defined) within the route handler's scope.

**3. Exact Safe-Scope Files to Touch First**
*   `routes/lifeos-council-builder-routes.js` (primary modification target)
*   Potentially a related service or utility file (e.g., `services/builder-control-plane-service.js`) if `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not yet defined or need modification.

**4. Verifier/Runtime Checks**
*   **Unit Tests:**
    *   Verify `POST /build/start` handler correctly parses input and calls `recordBuildStart` with the expected payload.
    *   Verify `POST /build/complete` handler correctly parses input and calls `recordBuildComplete` with the expected payload.
    *   Verify `POST /build/complete` returns `200` (or `204`) on successful completion.
    *   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` indicates failure (e.g., system health is RED).
*   **Integration Tests:**
    *   Simulate BuilderOS `build start` and `build complete` signals to ensure end-to-end flow correctly triggers the respective internal functions.
    *   Test the `409` scenario by simulating a `build complete` signal when `canMarkBuildDone` would fail.
*   **Runtime Monitoring:** Observe application logs for successful invocations of `recordBuildStart` and `recordBuildComplete`, and for `409` responses under failure conditions.

**5. Stop Conditions if Runtime Truth Disagrees**
*   If unit tests for the new routes fail, stop and debug the route handler logic.
*   If integration tests fail to reflect the expected behavior (e.g., functions not called, incorrect status codes), stop and debug the interaction between BuilderOS and LifeOS Council.
*   If `recordBuildStart` or `recordBuildComplete` are not observed in runtime logs as expected, stop and investigate route or service layer issues.
*   If the `409 Conflict` response is not returned when `canMarkBuildDone` indicates failure, or is returned incorrectly, stop and review the conditional logic.
*   **OIL Verifier Specific:** If the OIL verifier continues to reject this `.md` file due to `ERR_UNKNOWN_FILE_EXTENSION`, this indicates a misconfiguration in the verifier's execution environment (attempting to execute a markdown file as code). This issue is external to the content of this document and requires escalation to the verifier's maintainers for environment correction.