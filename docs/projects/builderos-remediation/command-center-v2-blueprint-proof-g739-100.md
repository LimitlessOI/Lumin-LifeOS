# Command Center V2 Blueprint Proof: G739-100 - Core Command Data Model & Persistence

This proof-closing blueprint note addresses the initial foundational slice for Command Center V2, focusing on the core `Command` entity's data model and basic persistence.

---

**1. Exact Missing Implementation or Proof Gap:**

The blueprint specifies a `Command` entity with attributes (ID, type, payload, status, createdAt, updatedAt, executedAt, completedAt, result, error). The immediate gap is the concrete definition of this entity within the database schema and the initial repository functions to create and retrieve `Command` records. This forms the absolute minimum viable data layer for the `Command` entity.

**2. Smallest Safe Build Slice to Close It:**

The smallest safe build slice involves establishing the `Command` entity's database schema and implementing basic CRUD operations (specifically `create` and `get` by ID) within a dedicated repository. This slice is self-contained, focusing solely on data persistence without involving complex business logic, external integrations (like message queues), or UI components.

**3. Exact Safe-Scope Files to Touch First:**

*   `src/db/migrations/V1__create_command_table.sql`: Defines the `commands` table schema.
*   `src/models/Command.ts`: Defines the TypeScript interface/type for the `Command` entity.
*   `src/repositories/CommandRepository.ts`: Implements functions for `createCommand` and `getCommandById`.
*   `src/repositories/index.ts`: Exports `CommandRepository`.
*   `src/tests/repositories/CommandRepository.test.ts`: Unit tests for the repository functions.

**4. Verifier/Runtime Checks:**

*   **Database Migration Check:** Verify that the `V1__create_command_table.sql` migration successfully runs and creates the `commands` table with the specified columns and constraints.
*   **Create Command Check:** Execute `CommandRepository.createCommand` with valid `type` and `payload` data. Verify that a new record is inserted into the `commands` table and the returned `Command` object contains a valid `id` and matches the input data (plus default `status`, `createdAt`, `updatedAt`).
*   **Get Command Check:** After creating a command, use its `id` to call `CommandRepository.getCommandById`. Verify that the retrieved `Command` object is not null/undefined and its attributes precisely match the data inserted during the `createCommand` step.
*   **Negative Get Command Check:** Call `CommandRepository.getCommandById` with a non-existent ID. Verify that it returns `null` or `undefined`.

**5. Stop Conditions if Runtime Truth Disagrees:**

*   **Migration Failure:** If the `V1__create_command_table.sql` migration fails to apply or results in an incorrect schema.
*   **Create Operation Failure:** If `CommandRepository.createCommand` throws an error, fails to insert a record, or returns an incomplete/incorrect `Command` object.
*   **Retrieval Mismatch:** If `CommandRepository.getCommandById` returns `null` for an existing ID, or if the retrieved `Command` object's data does not exactly match the data that was previously inserted.
*   **Database Connectivity Issues:** Any persistent errors indicating a failure to connect to or interact with the PostgreSQL database.
*   **Test Failures:** Any of the unit tests for `CommandRepository` fail.