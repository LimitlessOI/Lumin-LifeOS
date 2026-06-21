<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G739 100. -->

Amendment 12 Command Center Proof: G739-100 - Initial Task Data Exposure

This document outlines the first proof-closing build slice for the BuilderOS Command Center, focusing on establishing the foundational data exposure for task management.

---

1.  **Exact missing implementation or proof gap:**
    The `AMENDMENT_12_COMMAND_CENTER.md` blueprint requires initial task data exposure for the BuilderOS Command Center. The current gap is the absence of a dedicated, read-only internal API endpoint to list active BuilderOS tasks and their essential metadata (ID, status, type, associated project/build).

2.  **Smallest safe build slice to close it:**
    Implement a new, internal, read-only API endpoint: `/builder-os/api/v1/command-center/tasks`. This endpoint will retrieve a minimal set of active task data from the existing BuilderOS task storage and return it as a JSON array. This slice focuses solely on data retrieval and exposure, without any write operations, complex filtering, or pagination.

3.  **Exact safe-scope files to touch first:**
    *   `src/builder-os/api/v1/command-center/tasks.js` (New file): Defines the Express route handler for `GET /tasks`.
    *   `src/builder-os/api/v1/command-center/index.js` (New file): Aggregates and exports Command Center routes.
    *   `src/builder-os/app.js` (Existing file): Mounts the new Command Center router under `/builder-os/api/v1/command-center`.
    *   `src/builder-os/data/task-store.js` (New or existing file): Provides a simple function to retrieve active task data from the underlying storage.

4.  **Verifier/runtime checks:**
    *   **Unit Tests:** `src/builder-os/api/v1/command-center/tasks.test.js` verifies the handler correctly calls `task-store` and formats the response.
    *   **Integration Tests:** `src/builder-os/api/v1/command-center/integration.test.js` confirms `GET /builder-os/api/v1/command-center/tasks` returns `200 OK` with a valid JSON array (potentially empty or with mock data).
    *   **Manual `curl` check:** `curl -X GET http://localhost:<port>/builder-os/api/v1/command-center/tasks` should return a JSON array.
    *   **Schema Validation:** Ensure the returned JSON objects conform to a basic `Task` schema (e.g., `{ id: string, type: string, status: string, projectId: string }`).

5.  **Stop conditions if runtime truth disagrees:**
    *   The endpoint returns any HTTP status code other than `200 OK`.
    *   The response body is not a valid JSON array.
    *   The JSON array elements do not contain the expected `id`, `type`, `status`, and `projectId` fields.
    *   The endpoint exposes any data beyond the minimal task metadata specified.
    *   The endpoint introduces measurable performance degradation (e.g., response time > 500ms under light load).