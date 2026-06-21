<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G639 100. -->

AMENDMENT 12: COMMAND CENTER - Proof G639-100: Initial Build Status Data Feed

This proof-closing blueprint note addresses the foundational requirement for the Command Center's Phase 1 (MVP) Dashboard: establishing a basic, read-only data feed for build status. This slice focuses on exposing the current status of a single, representative BuilderOS build.

---

1.  **Exact Missing Implementation or Proof Gap**
    The core gap is the absence of a defined and accessible mechanism to retrieve real-time or near real-time status information for active BuilderOS builds. Specifically, for the MVP Dashboard, we need a read-only endpoint that can report the status of at least one build. This initial slice proves the plumbing for data exposure.

2.  **Smallest Safe Build Slice to Close It**
    Implement a new internal BuilderOS apiEP that returns the current status of a single, identified build. This endpoint will initially serve mock or placeholder data to prove the API contract and accessibility, before being connected to actual build state management.

    **API Endpoint Proposal:**
    `GET /builderos/api/v1/builds/:buildId/status`

    **Expected Response (JSON):**
    ```json
    {
      "buildId": "string",
      "status": "string", // e.g., "QUEUED", "RUNNING", "SUCCESS", "FAILED", "CANCELLED"
      "startTime": "ISO 8601 string",
      "endTime": "ISO 8601 string | null",
      "progress": "number | null", // 0-100
      "message": "string | null"
    }
    ```
    This slice focuses purely on the API definition and a mock implementation. No database integration or complex state management is included in this initial proof.

3.  **Exact Safe-Scope Files to Touch First**
    *   `builderos/api/v1/routes/buildStatusRoutes.js`: Defines the new `GET /builderos/api/v1/builds/:buildId/status` route.
    *   `builderos/api/v1/controllers/buildStatusController.js`: Implements the handler for the build status endpoint, initially returning mock data.
    *   `builderos/api/v1/schemas/buildStatusSchema.js`: Defines the Joi/Yup/Zod schema for validating the API response structure.
    *   `builderos/api/index.js` (or similar entry point): Registers the new `buildStatusRoutes` with the main BuilderOS API router.
    *   `builderos/tests/api/v1/buildStatus.test.js`: Unit/integration tests for the new endpoint and controller.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** `builderos/tests/api/v1/buildStatus.test.js` passes, ensuring the controller logic (even with mock data) functions as expected.
    *   **Integration Tests:** An automated test (e.g., using `supertest` or `axios`) successfully calls `GET /builderos/api/v1/builds/test-build-123/status` and receives a 200 OK response with a JSON payload matching the `buildStatusSchema`.
    *   **Schema Validation:** The response payload from the API endpoint validates against `builderos/api/v1/schemas/buildStatusSchema.js`.
    *   **Manual Curl Check:** `curl -X GET http://localhost:PORT/builderos/api/v1/builds/test-build-123/status` returns the expected mock JSON.
    *   **Log Monitoring:** BuilderOS logs show successful route registration and no errors when the endpoint is hit.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   The API endpoint returns any HTTP status code other than 200 OK for valid requests.
    *   The API response payload does not conform to the defined `buildStatusSchema`.
    *   The endpoint introduces measurable latency or resource consumption increases in BuilderOS beyond acceptable thresholds.
    *   Security scans identify any vulnerabilities introduced by the new endpoint.
    *   The route fails to register or causes BuilderOS to fail startup.