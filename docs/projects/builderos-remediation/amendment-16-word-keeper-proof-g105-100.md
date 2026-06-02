# Amendment 16 Word Keeper Proof - G105-100: Initial Data Model & Repository

This document serves as a proof-closing blueprint note for the initial build slice of Amendment 16, the Word Keeper feature. It addresses the foundational data model and persistence layer required before any higher-level logic or user-facing interactions can be built.

---

**1. Exact missing implementation or proof gap:**
The core data model definition for a `Word` entity and its corresponding persistence layer (repository) are missing. This includes the schema definition and basic CRUD operations for storing and retrieving individual words.

**2. Smallest safe build slice to close it:**
Define the `Word` domain entity and implement a basic `WordRepository` capable of creating and retrieving `Word` instances. This slice focuses solely on the data structure and its direct persistence, without exposing any API endpoints or business logic.

**3. Exact safe-scope files to touch first:**
*   `src/domain/word/Word.ts` (Defines the `Word` entity interface/class)
*   `src/infrastructure/persistence/schemas/WordSchema.ts` (Defines the database schema for `Word` using the chosen ORM/ODM)
*   `src/infrastructure/persistence/WordRepository.ts` (Implements the repository methods for `Word` persistence)
*   `src/infrastructure/database/migrations/YYYYMMDDHHMMSS_create_word_table.ts` (Database migration script to create the `words` table)
*   `src/infrastructure/persistence/index.ts` (Exports the new `WordRepository` for dependency injection)

**4. Verifier/runtime checks:**
*   **Unit Tests:**
    *   `Word.ts`: Verify `Word` entity creation and basic property access.
    *   `WordRepository.ts`: Verify `create` method successfully persists a `Word` and `findById` retrieves it correctly.
*   **Integration Tests:**
    *   Run database migrations and confirm the `words` table exists with expected columns (`id`, `value`, `createdAt`, `updatedAt`).
    *   Execute a full cycle: create a `Word` via `WordRepository`, then retrieve it, asserting data integrity.
*   **Manual Database Inspection:**
    *   After running tests, connect to the development database and confirm entries in the `words` table match test data.

**5. Stop conditions if runtime truth disagrees:**
*   `Word` entity validation fails during instantiation (e.g., `value` is not a string, or is empty).
*   `WordRepository.create()` throws an error indicating a database connection issue, schema mismatch, or data integrity violation.
*   `WordRepository.findById()` returns `null` or an incorrect `Word` instance for a known ID.
*   Database migration fails to apply or results in an incorrect table structure.
*   Performance of `create` or `findById` operations exceeds acceptable thresholds (e.g., >50ms for a single operation on a cold cache).