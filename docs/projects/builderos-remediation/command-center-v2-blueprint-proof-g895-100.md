# Command Center V2 Blueprint Proof: G895-100 - Initial Command Entity API Slice

This document serves as a proof-closing note for the initial build slice derived from the `COMMAND_CENTER_V2_BLUEPRINT.md`. It outlines the smallest, safest, and most foundational implementation step to establish the core `Command` entity within the Command Center V2 architecture.

---

### Blueprint Note: Initial Command Entity API Slice

**1. Exact Missing Implementation or Proof Gap:**
The foundational data model and a minimal API endpoint for the core `Command` entity are not yet implemented. Specifically, the ability to retrieve a collection of `Command` entities via a dedicated V2 API route is missing. This gap prevents any subsequent UI or service integration with the core Command Center V2 data.

**2. Smallest Safe Build Slice to Close It:**
Implement the `GET /api/v2/commands` endpoint. This endpoint will retrieve all `Command` entities from a newly created `commands` database table. This slice includes:
    *   A database migration to create the `commands` table with essential fields (`id`, `name`, `status`, `createdAt`, `updatedAt`).
    *   A basic `Command` model definition.
    *   A new V2 API router and route handler for `GET /api/v2/commands`.
    *   Integration of the new V2 router into the main application.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/db/migrations/YYYYMMDDHHMMSS_create_commands_table.js` (New file)
*   `src/models/Command.js` (New file, or extend `src/models/BaseModel.js` if applicable)
*   `src/routes/v2/commands.js` (New file)
*   `src/app.js` or `src/server.js` (To register `src/routes/v2/commands.js` router)
*   `src/tests/api/v2/commands.test.js` (New file for API integration tests)

**4. Verifier/Runtime Checks:**
*   **Database Migration Check:** Verify that the `YYYYMMDDHHMMSS_create_commands_table.js` migration runs successfully and creates the `commands` table with the expected schema (e.g., `id`, `name`, `status`, `createdAt`, `updatedAt`).
*   **Empty State API Check:** Execute `GET /api/v2/commands`. Expect an HTTP 200 OK response with an empty JSON array `[]`.
*   **Populated State API Check:** Insert at least one `Command` record directly into the `commands` table (e.g., via a database seed or direct SQL). Execute `GET /api/v2/commands`. Expect an HTTP 200 OK response containing a JSON array with the inserted `Command` object(s), matching the defined schema.
*   **Schema Validation:** Ensure the returned `Command` objects conform to the expected data structure (e.g., `id` is a UUID, `name` is a string, `status` is an enum, `createdAt`/`updatedAt` are ISO timestamps).

**5. Stop Conditions if Runtime Truth Disagrees:**
*   The database migration fails to execute or results in an incorrect table schema.
*   `GET /api/v2/commands` returns any HTTP 5xx status code.
*   `GET /api/v2/commands` returns an HTTP 404 Not Found error, indicating the route is not registered.
*   `GET /api/v2/commands` returns an HTTP 200 OK, but the response body is not a JSON array, or the objects within the array do not match the expected `Command` schema.
*   Performance metrics for the endpoint are unacceptably slow (e.g., >500ms for an empty or small dataset).