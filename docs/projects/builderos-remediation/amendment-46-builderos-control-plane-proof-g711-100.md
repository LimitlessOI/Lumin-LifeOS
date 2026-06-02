Amendment 46 BuilderOS Control Plane Proof - G711-100
Source Blueprint: `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`
---
Proof-Closing Blueprint Note

This note outlines the missing implementation details and the next steps required to fully wire the BuilderOS control plane routes as specified in Amendment 46.

1.  **Exact Missing Implementation or Proof Gap:**
    The primary gap is the implementation of two new POST endpoints within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. These endpoints must integrate with existing internal BuilderOS service functions.
    Specifically:
    *   A `POST /build/start` endpoint is required to accept `task_id`, `blueprint_id`, and `model_used` and invoke an internal `recordBuildStart` function.
    *   A `POST /build/complete` endpoint is required to accept a `token` and `OIL receipt IDs` and invoke an internal `recordBuildComplete` function.
    *   Crucially, the `/build/complete` endpoint must perform a health check using an internal `canMarkBuildDone` function. If `canMarkBuildDone` returns `false` when the system health is determined to be RED, the endpoint must return a `409 Conflict` HTTP status code.

2.  **Smallest Safe Build Slice to Close It:**
    The smallest safe build slice involves adding the two specified POST routes (`/build/start` and `/build/complete`) to `routes/lifeos-council-builder-routes.js`. Each route handler will be responsible for:
    *   Input validation (e.g., ensuring required parameters are present and correctly formatted).
    *   Calling the respective internal BuilderOS service function (`recordBuildStart`, `recordBuildComplete`).
    *   For `/build/complete`, implementing the conditional `canMarkBuildDone` check and returning `409 Conflict` as required.
    *   Returning appropriate success (e.g., `200 OK`, `202 Accepted`) or error (e.g., `400 Bad Request`, `500 Internal Server Error`) HTTP status codes based on the outcome of the internal service calls.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new `POST /build/start` and `POST /build/complete` endpoints.
    *   `services/builder-control-plane-service.js` (or equivalent existing BuilderOS internal service module): This module is assumed to contain or will be extended to contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If these functions do not exist, they must be implemented here following existing service patterns.
    *   `tests/routes/lifeos-council-builder-routes.test.js` (or equivalent): New unit and integration tests will be added to cover the functionality of the new routes.

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests:** Verify individual route handler logic, input validation, and correct invocation of internal service functions. Mock internal service calls to ensure expected behavior.
    *   **Integration Tests:** Simulate `POST /build/start` and `POST /build/complete` requests with valid and invalid payloads.
        *   Verify `2xx` responses for successful operations.
        *   Verify `400 Bad Request` for invalid input.
        *   Specifically test `/build/complete` with system health RED and `canMarkBuildDone` returning `false` to confirm `409 Conflict`.
        *   Test `/build/complete` with system health GREEN or `canMarkBuildDone` returning `true` to confirm successful completion.
    *   **Logging & Monitoring:** Observe BuilderOS control plane logs for successful `recordBuildStart` and `recordBuildComplete` events. Monitor system health indicators during build completion attempts.
    *   **End-to-End Verification:** Trigger a full BuilderOS build process and confirm that the start and complete events are correctly recorded in the BuilderOS state, and that the control plane behaves as expected under various health conditions.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   **Service Call Failures:** If `recordBuildStart` or `recordBuildComplete` consistently fail to execute or record data correctly, indicating issues with the underlying BuilderOS state management.
    *   **Incorrect Health Check Behavior:** If the `canMarkBuildDone` function returns inconsistent results, or if the `/build/complete` endpoint fails to return `409 Conflict` when health is RED and `canMarkBuildDone` indicates failure.
    *   **Data Inconsistency:** If the BuilderOS state (e.g., build status, associated OIL receipts) does not accurately reflect the outcomes of the control plane operations.
    *   **Performance Degradation:** Any significant increase in latency or resource consumption within the `lifeos-council-builder-routes` or associated BuilderOS services.
    *   **Regression:** Introduction of new bugs or unexpected behavior in existing BuilderOS or LifeOS functionality.
    *   **Security Vulnerabilities:** Discovery of any new security risks related to the new endpoints or their interactions with internal services.