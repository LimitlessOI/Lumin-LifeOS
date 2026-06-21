<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G891 100. -->

AMENDMENT_12_COMMAND_CENTER Proof: G891-100 - Initial Build Status API Endpoint
This document serves as a proof-closing blueprint note for the initial build slice related to the BuilderOS Command Center, specifically focusing on establishing a foundational internal API for build status retrieval.

1.  **Exact Missing Implementation or Proof Gap**
    The BuilderOS platform currently lacks a dedicated internal API endpoint to retrieve the real-time status of ongoing or recently completed builds. This gap prevents the Command Center from displaying accurate, up-to-date build information, hindering operational visibility and control.

2.  **Smallest Safe Build Slice to Close It**
    Implement a new internal `/api/v1/builds/:buildId/status` GET endpoint within the BuilderOS API service. This endpoint will initially return a mock or simplified build status object (e.g., `{ status: "RUNNING", progress: 50, lastUpdate: "2024-07-20T10:00:00Z" }`) for a given `buildId`. The focus is on establishing the route, basic request handling, and a consistent response structure, without integrating with the full build execution engine in this slice.

3.  **Exact Safe-Scope Files to Touch First**
    *   `src/api/builderos/routes/buildStatusRoutes.js`: New file to define the GET `/api/v1/builds/:buildId/status` route.
    *   `src/api/builderos/controllers/buildStatusController.js`: New file to implement the handler for the build status endpoint, returning a placeholder/mock status.
    *   `src/api/builderos/index.js`: Modify to import and register `buildStatusRoutes.js` with the main BuilderOS API router.
    *   `src/api/builderos/schemas/buildStatusSchema.js`: New file to define the Joi/Yup schema for the build status response.
    *   `tests/unit/api/builderos/buildStatusController.test.js`: New file for unit tests for the controller.
    *   `tests/integration/api/builderos/buildStatus.test.js`: New file for integration tests for the endpoint.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** All tests in `tests/unit/api/builderos/buildStatusController.test.js` pass, verifying correct mock response structure and error handling for invalid `buildId` formats.
    *   **Integration Tests:** All tests in `tests/integration/api/builderos/buildStatus.test.js` pass, verifying the endpoint is reachable, returns a 200 OK status, and the response body conforms to `buildStatusSchema.js` when queried with a valid (even if mock) `buildId`.
    *   **Manual Verification:**
        *   `curl -X GET http://localhost:PORT/api/v1/builds/mock-build-123/status` returns a JSON object with `status`, `progress`, and `lastUpdate` fields.
        *   `curl -X GET http://localhost:PORT/api/v1/builds/invalid-id/status` returns an appropriate 4xx error with a clear error message.
    *   **Logs:** No unexpected errors or warnings in BuilderOS API service logs related to the new endpoint.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   **Endpoint Unreachable:** The `/api/v1/builds/:buildId/status` endpoint consistently returns 404 or 500 errors, indicating a routing or server startup issue.
    *   **Schema Mismatch:** The API response body does not conform to the defined `buildStatusSchema.js`, even for mock data.
    *   **Performance Degradation:** Introduction of the endpoint causes a measurable increase in API service latency or resource consumption (CPU/memory) under light load.
    *   **Security Vulnerability:** Any identified vulnerability (e.g., injection, unauthorized access) related to the new endpoint.
    *   **Conflicting Routes:** The new route conflicts with an existing BuilderOS or LifeOS route, causing unexpected behavior for other features.