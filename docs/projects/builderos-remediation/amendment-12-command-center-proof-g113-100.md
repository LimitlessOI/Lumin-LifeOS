Amendment 12 Command Center: Proof G113-100 - BuilderOS Task Status API

This document outlines the next smallest build slice for the Amendment 12 Command Center, focusing on establishing a foundational API for BuilderOS task status. This proof-closing note addresses the initial gap in programmatic access to BuilderOS operational state.

---

### Blueprint Note: BuilderOS Task Status API Endpoint

**1. Exact Missing Implementation or Proof Gap:**
Programmatic read-only access to BuilderOS task execution status is currently unavailable. The system lacks a dedicated, secure, and performant API endpoint to query the real-time status of individual BuilderOS tasks. This gap prevents external systems and internal tooling from monitoring task progress and outcomes effectively.

**2. Smallest Safe Build Slice to Close It:**
Implement a new BuilderOS API endpoint: `/api/builderos/v1/tasks/:taskId/status`.
This endpoint will accept a `taskId` as a path parameter and return a JSON object containing the current status of that specific BuilderOS task. The initial implementation will focus on a read-only GET request, providing basic status (e.g., `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`).

**3. Exact Safe-Scope Files to Touch First:**
*   `src/api/builderos/taskStatusController.js` (New file): Handles the HTTP request, extracts `taskId`, calls the service layer, and formats the response.
*   `src/services/builderos/taskStatusService.js` (New file): Contains the core logic to interface with BuilderOS internal state/logs to retrieve task status. Initially, this can be a mock or a simple lookup against a temporary in-memory store.
*   `src/routes/builderosRoutes.js` (Existing file): Register the new `/api/builderos/v1/tasks/:taskId/status` GET route, mapping it to `taskStatusController.getTaskStatus`.
*   `src/tests/api/builderos/taskStatus.test.js` (New file): API integration tests for the new endpoint, covering valid `taskId` responses and error handling for invalid/non-existent `taskId`.

**4. Verifier/Runtime Checks:**
*   **Unit Tests:** Ensure `src/services/builderos/taskStatusService.js` correctly processes task IDs and returns expected status values (e.g., `npm test src/services/builderos/taskStatusService.test.js`).
*   **Integration Tests:** Verify the API endpoint's behavior, including successful responses for known tasks and appropriate error codes (e.g., 404 for unknown tasks) (e.g., `npm test src/api/builderos/taskStatusController.test.js`).
*   **Manual API Call:** Execute `curl -X GET http://localhost:3000/api/builderos/v1/tasks/G113-100/status` and confirm a JSON response with a valid status field (e.g., `{"taskId": "G113-100", "status": "RUNNING"}`).
*   **BuilderOS Internal Log Verification:** Confirm that the service layer's interaction with BuilderOS internal state (e.g., querying a database, reading a log file) is correctly initiated and processed.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   The API endpoint returns a 404 Not Found error for the specified route.
*   The API returns a 500 Internal Server Error or malformed JSON responses.
*   Integration tests fail, indicating issues with routing, controller logic, or service integration.
*   The returned task status does not accurately reflect the actual state of the BuilderOS task as observed in BuilderOS internal monitoring or logs.
*   Significant latency (e.g., >500ms) is observed for task status queries, indicating a performance bottleneck.
*   Security vulnerabilities are identified (e.g., unauthorized access to task status, data leakage).