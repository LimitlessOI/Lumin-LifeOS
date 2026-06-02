# Blueprint Proof: Command Center V2 - G281-100

This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, derived from `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`.

---

### Blueprint Note: Initial Command Definition and Service

**1. Exact Missing Implementation or Proof Gap:**
The foundational definition of a `Command` entity and a basic service for its management (creation, retrieval) is missing. This gap prevents any further development of command processing, scheduling, or execution features.

**2. Smallest Safe Build Slice to Close It:**
Define the core `ICommand` interface and implement a `CommandService` that provides basic in-memory CRUD operations for `Command` objects. This service will serve as the initial data access layer, allowing subsequent slices to build upon a stable command representation.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/core/command/ICommand.ts`: Defines the TypeScript interface for a `Command` object.
*   `src/core/command/CommandService.ts`: Implements the `CommandService` class with methods like `createCommand`, `getCommandById`, `getAllCommands`. Initially, this service will use an in-memory store (e.g., a `Map`).
*   `src/api/routes/commandRoutes.ts`: Defines a minimal set of API routes (e.g., `POST /commands`, `GET /commands/:id`, `GET /commands`) that expose the `CommandService` functionality.
*   `src/api/index.ts`: Integrates the `commandRoutes` into the main API router.

**4. Verifier/Runtime Checks:**
*   **Unit Tests:**
    *   `CommandService.test.ts`: Verify `createCommand` successfully adds a command and returns it. Verify `getCommandById` retrieves the correct command. Verify `getAllCommands` returns all created commands.
*   **Integration Tests:**
    *   `commandRoutes.test.ts`: Send `POST /commands` requests and assert a 201 status code and the created command in the response. Send `GET /commands/:id` requests and assert a 200 status code and the correct command. Send `GET /commands` and assert a 200 status code and an array of commands.
*   **Manual Verification (curl/Postman):**
    *   Start the LifeOS platform.
    *   `curl -X POST -H "Content-Type: application/json" -d '{"name": "Test Command", "type": "system", "payload": {}}' http://localhost:3000/api/v1/commands`
    *   `curl http://localhost:3000/api/v1/commands`
    *   `curl http://localhost:3000/api/v1/commands/<id_from_post>`

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If `ICommand` cannot be imported or correctly implemented by `CommandService`.
*   If `CommandService` methods throw unexpected errors or do not return data conforming to `ICommand`.
*   If API endpoints return 4xx/5xx errors for valid requests, or 200/201 with malformed responses.
*   If the API responses do not accurately reflect the state managed by `CommandService` (e.g., `GET` after `POST` does not return the posted item).
*   If the new routes interfere with existing LifeOS user features or TSOS customer-facing surfaces.