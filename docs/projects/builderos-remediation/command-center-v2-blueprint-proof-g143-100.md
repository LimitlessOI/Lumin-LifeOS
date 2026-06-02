# Command Center V2 Blueprint Proof: G143-100 - Core Command Entity & Internal API

This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, derived from `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`. It focuses on establishing the foundational data model and a minimal internal API for command management.

---

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of a defined, persistent core `Command` entity and the necessary internal API endpoints to manage its lifecycle. This foundational layer is critical for all subsequent Command Center V2 features, including execution, logging, and status tracking.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Defining the `Command` data model (schema).
*   Implementing a service layer for basic CRUD operations on `Command` entities.
*   Exposing internal API endpoints to create and retrieve `Command` entities.

This slice establishes the core data structure and interaction points without impacting existing LifeOS user features or TSOS customer-facing surfaces, adhering strictly to internal safe scope.

### 3. Exact Safe-Scope Files to Touch First

Based on existing Node/ESM patterns for internal services:

*   `src/internal/models/Command.js`: Define the Mongoose (or similar ORM) schema for the `Command` entity.
    *   Fields: `id` (UUID), `name` (string), `status` (enum: `PENDING`, `EXECUTING`, `COMPLETED`, `FAILED`), `payload` (JSONB/Object), `result` (JSONB/Object, nullable), `createdBy` (string), `createdAt` (Date), `updatedAt` (Date).
*   `src/internal/services/commandService.js`: Implement functions for `createCommand(data)` and `getCommands(filters)`.
    *   These functions will interact with the `Command` model for persistence.
*   `src/internal/routes/commandRoutes.js`: Define an Express (or similar) router for `/internal/commands`.
    *   `POST /internal/commands`: Route to create a new command, using `commandService.createCommand`.
    *   `GET /internal/commands`: Route to retrieve commands, using `commandService.getCommands`.
*   `src/internal/index.js` (or equivalent entry point for internal API): Integrate `commandRoutes` into the main internal application router.

### 4. Verifier/Runtime Checks

*   **API Endpoint Availability:**
    *   `curl -X POST -H "Content-Type: application/json" -d '{"name": "test-command", "payload": {"action": "ping"}}' http://localhost:<INTERNAL_API_PORT>/internal/commands` should return `HTTP 201 Created` with the new command object, including an `id` and `status: PENDING`.
    *   `curl http://localhost:<INTERNAL_API_PORT>/internal/commands` should return `HTTP 200 OK` with an array containing the previously created command.
*   **Data Persistence:** After creating a command and restarting the internal service, the `GET /internal/commands` endpoint should still return the created command, verifying database persistence.
*   **Schema Validation:** Attempting to create a command with missing required fields (e.g., `name`) should result in an `HTTP 400 Bad Request` error.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Route Conflict:** If registering `/internal/commands` routes causes conflicts with existing production or internal routes, indicating an unexpected routing pattern or namespace collision.
*   **Database Connection Failure:** If the internal service fails to connect to its designated database instance for `Command` persistence.
*   **Schema Incompatibility:** If the defined `Command` schema cannot be applied to the database without critical errors or data loss due to existing table structures or naming conventions.
*   **Performance Degradation:** If initial load testing of the `createCommand` or `getCommands` endpoints shows unacceptable latency or resource consumption for expected internal usage.