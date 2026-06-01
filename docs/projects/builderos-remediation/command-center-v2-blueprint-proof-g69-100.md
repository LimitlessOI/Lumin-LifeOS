# Blueprint Proof: Command Center V2 - Create Command Endpoint (g69-100)

This document serves as a proof-closing blueprint note for the `g69-100` build slice, focusing on the foundational capability to create new commands within the Command Center V2.

---

## Proof-Closing Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The core capability to persist a new `Command` entity via a dedicated API endpoint is not yet implemented or proven. This includes the `POST /commands` API route, its associated request validation, and the service/data layer logic required to safely store a new command in the underlying data store.

**2. Smallest Safe Build Slice to Close It:**
Implement the `POST /commands` API endpoint to allow for the creation of new `Command` entities. This slice encompasses:
    a.  Defining the API route and handler for `POST /commands`.
    b.  Implementing request body validation for the `Command` creation payload.
    c.  Developing a service layer function to encapsulate the business logic for creating a command.
    d.  Implementing a data access layer function to persist the new `Command` entity to the database.
    e.  Ensuring appropriate response codes and body for success and failure scenarios.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/api/commandRoutes.js`: Add the `POST /commands` route and link to the controller.
*   `src/controllers/commandController.js`: Implement the `createCommand` handler function.
*   `src/services/commandService.js`: Add the `createCommand` business logic function.
*   `src/data/commandRepository.js`: Add the `saveCommand` function for database interaction.
*   `src/models/command.js`: (If not already present) Define or update the `Command` schema/model.
*   `src/validation/commandSchema.js`: (If using a dedicated validation module) Define the schema for `POST /commands` request body.

**4. Verifier/Runtime Checks:**
*   **Positive Case:** Send a `POST` request to `/commands` with a valid `Command` payload (e.g., `{ "name": "Deploy Service X", "status": "pending", "priority": "high" }`).
    *   Expected: HTTP Status `201 Created`.
    *   Expected: Response body contains the newly created `Command` object, including a unique `id` and any default fields.
    *   **Follow-up:** Immediately send a `GET` request to `/commands/{newly_created_id}`.
    *   Expected: HTTP Status `200 OK`.
    *   Expected: Response body matches the `Command` created in the positive case.
*   **Negative Case (Invalid Payload):** Send a `POST` request to `/commands` with an invalid `Command` payload (e.g., missing `name`, invalid `status`).
    *   Expected: HTTP Status `400 Bad Request`.
    *   Expected: Response body contains clear error messages indicating validation failures.
*   **Negative Case (Database Error Simulation):** (If possible via test environment configuration) Simulate a database connection error or constraint violation during `POST /commands`.
    *   Expected: Appropriate HTTP Status (e