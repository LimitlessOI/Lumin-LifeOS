# Command Center V2 Blueprint Proof: G647-100 - Initial Command Ingestion

This document outlines the first proof-closing build slice for Command Center V2, focusing on the foundational capability to define and ingest new commands into the system. This slice addresses the immediate gap of establishing a mechanism for commands to enter the Command Center's operational scope.

---

### Blueprint Note: Initial Command Ingestion

1.  **Exact missing implementation or proof gap:**
    The core gap is the absence of a defined `Command` data model and a functional API endpoint to receive and persist new commands. This prevents any command from entering the system for subsequent processing or tracking.

2.  **Smallest safe build slice to close it:**
    Implement a basic `Command` data model and a `POST /api/v2/commands` endpoint. This endpoint will:
    *   Accept a JSON payload representing a new command.
    *   Perform minimal schema validation on the incoming command (e.g., `type`, `payload`).
    *   Assign a unique `commandId` and an initial `status` (e.g., `RECEIVED`).
    *   Persist the command data to the database.
    *   Return a `201 Created` response with the `commandId`.

3.  **Exact safe-scope files to touch first:**
    *   `src/db/models/Command.js`: Define the Mongoose/Sequelize schema for the `Command` entity.
    *   `src/api/v2/commands/controller.js`: Implement the logic for receiving, validating, and persisting commands.
    *   `src/api/v2/commands/routes.js`: Define the `POST /api/v2/commands` route and link it to the controller.
    *   `src/api/v2/index.js`: Register the new `commands` router.

4.  **Verifier/runtime checks:**
    *   **Positive Test:** Send a valid `POST` request to `/api/v2/commands` with a well-formed command payload.
        *   Expected: HTTP `201 Created` response, containing the `commandId`.
        *   Expected: A new record exists in the `commands` database collection/table with the provided `type`, `payload`, a generated `commandId`, and `status: 'RECEIVED'`.
    *   **Negative Test (Invalid Payload):** Send a `POST` request to `/api/v2/commands` with a missing `type` or `payload`.
        *   Expected: HTTP `400 Bad Request` response, with an informative error message.
        *   Expected: No new record is created in the `commands` database.
    *   **Data Integrity Test:** Retrieve the command by its `commandId` after a successful `POST`.
        *   Expected: The retrieved command's `type` and `payload` exactly match the original input.

5.  **Stop conditions if runtime truth disagrees:**
    *   If `POST /api/v2/commands` consistently returns `5xx` errors for valid inputs.
    *   If valid commands are not persisted to the database, or are persisted with incorrect data or an incorrect initial status.
    *   If invalid command payloads are accepted and persisted without `400` errors.
    *   If the `commandId` is not unique or not generated correctly.