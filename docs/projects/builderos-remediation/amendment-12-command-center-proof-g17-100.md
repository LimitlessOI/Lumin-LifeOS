Amendment 12 Command Center Proof - G17-100: Command Persistence Proof
This document outlines the next smallest build slice to prove the foundational persistence of `Command` objects as defined in `AMENDMENT_12_COMMAND_CENTER.md`.
---
Blueprint Note: Command Persistence Proof
1.  **Exact missing implementation or proof gap:**
    The foundational persistence layer for `Command` objects is missing. This includes the database schema definition for `Command` entities and the core repository methods to create and retrieve `Command` instances. Without this, `Command` objects cannot be reliably stored and retrieved across BuilderOS execution cycles.

2.  **Smallest safe build slice to close it:**
    Implement the minimal database schema for `Command` objects and a `CommandRepository` with `create` and `findById` methods. This slice focuses solely on proving the ability to persist a `Command` and retrieve it by its identifier, without introducing complex business logic or external integrations.

3.  **Exact safe-scope files to touch first:**
    *   `src/builder-os/data/migrations/001_create_commands_table.js`: Defines the SQL schema for the `commands` table.
    *   `src/builder-os/data/models/Command.js`: Defines the data model for a `Command` object, mapping to the database schema.
    *   `src/builder-os/data/repositories/CommandRepository.js`: Implements the `create(command)` and `findById(id)` methods for `Command` persistence.
    *   `src/builder-os/tests/data/repositories/CommandRepository.test.js`: Contains unit/integration tests to verify the persistence operations.

4.  **Verifier/runtime checks:**
    *   **Schema Verification:** Run database migrations; confirm `commands` table exists with expected columns (`id`, `type`, `payload`, `status`, `createdAt`, `updatedAt`).
    *   **Create Operation:** Instantiate a `Command` object, call `CommandRepository.create()`, and verify no errors are thrown.
    *   **Read Operation:** Retrieve the created `Command` using `CommandRepository.findById()` with the generated ID.
    *   **Data Integrity:** Assert that the retrieved `Command` object's properties (e.g., `type`, `payload`, `status`) exactly match those of the original `Command` object.

5.  **Stop conditions if runtime truth disagrees:**
    *   Database migration fails to create the `commands` table or its columns.
    *   `CommandRepository.create()` throws an error during insertion.
    *   `CommandRepository.findById()` returns `null` or throws an error for a known existing `Command` ID.
    *   The data retrieved by `findById()` does not match the data originally inserted by `create()`, indicating data corruption or incorrect mapping.