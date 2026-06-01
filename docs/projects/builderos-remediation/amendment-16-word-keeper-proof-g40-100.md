# Amendment 16: Word Keeper - Proof G40-100: Initial Word Creation Slice

This document outlines the next smallest blueprint-backed build slice for Amendment 16, focusing on the foundational capability to create and persist a new `Word` entity.

---

### Proof-Closing Blueprint Note

1.  **Exact missing implementation or proof gap:**
    The core functionality to define, validate, and persist a new `Word` entity into the database via an API endpoint is missing. This includes the database schema definition, the data model, the service layer logic for creation, and the corresponding API route.

2.  **Smallest safe build slice to close it:**
    Implement the `POST /words` API endpoint and the corresponding `WordKeeperService.createWord` method. This slice will establish the `words` database table, define the `Word` model, implement input validation, and handle the insertion of a single new word record into the database.

3.  **Exact safe-scope files to touch first:**
    *   `src/db/migrations/YYYYMMDDHHMMSS_create_words_table.js`: Database migration to create the `words` table with `id`, `word`, `definition`, `language`, `tags`, `metadata`, `createdAt`, `updatedAt` columns.
    *   `src/models/word.js`: Define the `Word` database model (e.g., Sequelize model or ORM entity definition) corresponding to the `words` table.
    *   `src/schemas/wordSchemas.js`: Define a Joi schema for validating the input payload for `POST /words` (e.g., `createWordSchema`).
    *   `src/services/wordKeeperService.js`: Implement the `createWord(wordData)` method, which takes validated word data and inserts it into the database, returning the newly created word object.
    *   `src/api/routes/wordKeeperRoutes.js`: Add the `POST /words` route, which will use the `createWordSchema` for validation and call `wordKeeperService.createWord`.

4.  **Verifier/runtime checks:**
    *   **Database Schema Check:** Verify that `npm run db:migrate` successfully creates the `words` table with the specified columns and constraints.
    *   **Unit Tests (`src/services/wordKeeperService.test.js`):**
        *   `createWord` successfully inserts a valid word and returns the created object.
        *   `createWord` throws a validation error for invalid or missing required fields (e.g., `word`, `definition`).
        *   `createWord` handles potential database errors (e.g., unique constraint violations if `word` is unique).
    *   **Integration Tests (`src/api/routes/wordKeeperRoutes.test.js`):**
        *   `POST /words` returns `201 Created` with the new word object for valid payloads.
        *   `POST /words` returns `400 Bad Request` for invalid payloads (e.g., missing `word` or `definition`).
        *   `POST /words` returns `409 Conflict` if a unique word constraint is violated (if implemented).
    *   **Manual API Test:** Use `curl` or a similar tool to send `POST` requests to `/words` with various valid and invalid payloads. Confirm the HTTP status codes, response bodies, and the actual state of the `words` table in the database.

5.  **Stop conditions if runtime truth disagrees:**
    *   The `words` table is not created or has an incorrect schema after migration.
    *   `POST /words` consistently returns `5xx` errors for valid input.
    *   `POST /words` returns `200 OK` instead of `201 Created` for successful creation.
    *   Words are not persisted in the database after a successful `POST /words` call.
    *   Input