<!-- SYNOPSIS: Blueprint Proof: Command Center V2 - Initial Command Submission (G247-100) -->

# Blueprint Proof: Command Center V2 - Initial Command Submission (G247-100)

This document outlines the first proof-of-concept build slice for the Command Center V2 blueprint, focusing on establishing the foundational capability to receive and persist a new command.

---

## Proof-Closing Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The core gap is the absence of an API endpoint and associated logic to receive a new command from a user and persist its initial state within the LifeOS platform. This is the absolute minimum required to demonstrate the command ingestion pipeline.

**2. Smallest Safe Build Slice to Close It:**
Implement a `POST /api/v2/commands` endpoint. This endpoint will accept a JSON payload representing a new command, perform basic validation, assign a unique ID, set an initial status (e.g., `PENDING`), and "persist" this command. For this initial proof, persistence can be a simple in-memory store or a mock database interaction to demonstrate data flow without full database integration.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/api/v2/commands/model.js`: Define the `Command` data structure/schema.
*   `src/api/v2/commands/controller.js`: Implement the logic for receiving, validating, and "persisting" a command.
*   `src/api/v2/commands/routes.js`: Define the `POST /api/v2/commands` route and link it to the controller.
*   `src/api/v2/index.js`: Register the new command routes with the main API router.
*   `src/types/command.d.ts`: (If TypeScript is in use) Define the TypeScript interface for the `Command` entity.

**4. Verifier/Runtime Checks:**
*   **API Reachability:** Send a `POST` request to `http://localhost:<PORT>/api/v2/commands` with a valid command payload (e.g., `{ "commandString": "list active tasks", "userId": "user-123" }`).
*   **Status Code:** Verify the API responds with a `201 Created` HTTP status code.
*   **Response Body:** Verify the response body is a JSON object containing the newly created command, including a generated `commandId`, the submitted `commandString`, `userId`, and an initial `status` (e.g., `PENDING`), and `createdAt` timestamp.
*   **"Persistence" Check:** If using an in-memory store, verify that a subsequent (mock) query for commands would include the newly created command. If logging, verify the command details appear in the application logs.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   **404 Not Found:** If the `POST /api/v2/commands` endpoint returns a 404, indicating the route was not registered correctly.
*   **5xx Server Error:** If any server-side error occurs (e.g., unhandled exception, database connection issue in a more advanced setup).
*   **Incorrect Status Code:** If the API returns any status code other than `201 Created` for a valid payload.
*   **Invalid Response Structure:** If the response body is not valid JSON, or if it's missing expected fields (`commandId`, `commandString`, `userId`, `status`, `createdAt`).
*   **No "Persistence":** If the command is not demonstrably "persisted" (e.g., not found in the mock store or logs), indicating a failure in the data handling logic.