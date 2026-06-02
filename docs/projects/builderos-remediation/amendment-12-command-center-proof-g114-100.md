Amendment 12 Command Center Proof: G114-100 - Initial Task API Slice
Blueprint Note: Core Task API Endpoint Implementation
This document outlines the next smallest build slice for the BuilderOS Command Center, focusing on establishing the foundational API for task management.
1. Exact Missing Implementation or Proof Gap
The core data model and initial apiEPs for BuilderOS tasks are currently missing. This gap prevents any interaction with BuilderOS tasks through the Command Center backend.
2. Smallest Safe Build Slice to Close It
Implement the `Task` data model definition and a basic `GET /api/builderos/tasks` endpoint. This endpoint will allow retrieval of all BuilderOS tasks, serving as the first verifiable step towards task management functionality.
3. Exact Safe-Scope Files to Touch First
-   `src/db/schema/builderos.js`: Define the `Task` schema.
-   `src/api/builderos/tasks/service.js`: Implement `getAllTasks` function to interact with the db.
-   `src/api/builderos/tasks/routes.js`: Define the `GET /` route for tasks, using the service.
-   `src/api/builderos/index.js`: Register the `tasks` routes under the `/builderos` API prefix.
-   `src/server.js` (or equivalent entry point): Ensure `src/api/builderos/index.js` is mounted.
4. Verifier/Runtime Checks
-   Database Connection: Verify that the application successfully connects to the PgSQL db upon startup.
-   API Endpoint Reachability: Send a `GET` request to `http://localhost:<port>/api/builderos/tasks`.
-   Response Status: Expect an HTTP 200 OK status code.
-   Response Body: Expect a JSON array. If no tasks are present, it should be an empty array `[]`. If tasks exist (e.g., seeded data), it should contain an array of task objects conforming to the defined schema.
-   Server Logs: Monitor server logs for any errors related to db queries or route handling.
5. Stop Conditions if Runtime Truth Disagrees
-   HTTP 5xx Errors: If the `GET /api/builderos/tasks` endpoint returns any 5xx server error, indicating a backend issue.
-   Database Connection Failure: If the application fails to connect to the db, preventing any data operations.
-   Incorrect Response Format: If the response is not a JSON array, or if task objects do not match the expected schema.
-   Endpoint Not Found (404): If the endpoint is not correctly registered and returns a 404, indicating a routing configuration issue.
-   Unexpected Data: If the returned data contains sensitive LifeOS user information or data not related to BuilderOS tasks.