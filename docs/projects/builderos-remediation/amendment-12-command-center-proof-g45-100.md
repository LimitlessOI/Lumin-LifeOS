Amendment 12 Command Center Proof: G45-100 - Initial Task Status API Endpoint
This document closes proof point G45-100 for Amendment 12, focusing on establishing the foundational apiEP for retrieving BuilderOS task status.
---
Proof-Closing Blueprint Note
1.  Exact missing implementation or proof gap:
    The `BuilderTaskStatus` data model is conceptually defined within the Amendment 12 blueprint, but its basic retrieval via a dedicated apiEP is not yet implemented or proven. Specifically, the ability to query a task's status by its ID through a RESTful interface is the current gap.
2.  Smallest safe build slice to close it:
    Implement a minimal `GET /api/v1/builderos/task-status/{taskId}` endpoint. This endpoint will initially return a hardcoded or mock `BuilderTaskStatus` object, demonstrating the API contract and basic routing. The focus is on endpoint accessibility and schema adherence, not dynamic data retrieval at this stage.
3.  Exact safe-scope files to touch first:
-   `src/api/v1/builderos/taskStatusController.js`: New file to handle the `GET` request for task status.
-   `src/routes/v1/builderos.js`: Add the new route definition for `/task-status/:taskId`.
-   `src/services/builderosTaskStatusService.js`: New file for a stubbed service function that returns a mock `BuilderTaskStatus` object.
-   `src/models/builderosTaskStatus.js`: Define the basic `BuilderTaskStatus` interface/schema (if not already present).
4.  Verifier/runtime checks:
-   Manual Check: Execute `curl -X GET http://localhost:3000/api/v1/builderos/task-status/test-task-123`.
-   Expected Outcome: HTTP 200 OK response with a JSON body similar to:
                        taskId: test-task-123
status: PENDING
progress: 0
message: Task initialized.
                        (The specific mock data can vary but must conform to the `BuilderTaskStatus` schema).
-   Automated Test: A new test file `test/api/v1/builderos/taskStatus.test.js` should be created and executed.
-   Expected Outcome: The test suite passes, asserting that the endpoint returns a 200 status and the response body matches the expected `BuilderTaskStatus` schema.
5.  Stop conditions if runtime truth disagrees:
-   The `curl` command or automated test returns an HTTP status code other than 200 (e.g., 404, 500).
-   The JSON response body is malformed, empty, or does not contain the expected `taskId`, `status`, and `progress` fields.
-   The application fails to start or throws routing errors related to the new endpoint.
-   The automated test suite fails due to assertion errors on the API response.