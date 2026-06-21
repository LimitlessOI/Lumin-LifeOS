<!-- SYNOPSIS: Documentation — Amendment 16 Word Keeper Proof G116 100. -->

Amendment 16 Word Keeper Proof - G116-100
Blueprint Follow-Through: Next Smallest Build Slice
This note details the next smallest, safest build slice to advance the implementation and proof of `AMENDMENT_16_WORD_KEEPER`. The focus is on establishing the foundational data persistence layer for the "Word Keeper" functionality.

1.  **Exact Missing Implementation or Proof Gap**
    The core gap is the definition of the `Word` entity's data model and the initial persistence layer for storing and retrieving these entities. This includes schema definition and basic data access operations (create, read) for a `Word` record.

2.  **Smallest Safe Build Slice to Close It**
    Define the `Word` entity schema and implement a basic repository interface for `Word` entities, supporting `createWord` and `getWordById` operations. This slice focuses purely on data definition and atomic persistence, without exposing it to higher-level application logic or user interfaces. The `Word` entity will minimally contain `id`, `word_text`, `definition`, `created_at`, and `updated_at` fields.

3.  **Exact Safe-Scope Files to Touch First**
    *   `src/data/schemas/word.schema.js`: Define the `Word` entity schema using existing BuilderOS schema patterns.
    *   `src/data/repositories/wordRepository.js`: Implement the `Word` data access layer, providing `createWord` and `getWordById` methods.
    *   `src/data/migrations/001_create_word_table.js`: (If applicable to the underlying data store) Create the initial migration script to establish the `words` table or collection.
    *   `src/data/index.js`: (If applicable) Register the new `wordRepository` for dependency injection or module export.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:**
        *   `test/unit/data/schemas/word.schema.test.js`: Verify the `Word` schema definition adheres to expected structure and validation rules.
        *   `test/unit/data/repositories/wordRepository.test.js`: Verify `createWord` and `getWordById` functionality using an in-memory or mocked data store.
    *   **Integration Tests:**
        *   `test/integration/data/wordPersistence.test.js`: Verify `createWord` and `getWordById` against a dedicated test database instance, ensuring actual data persistence and retrieval.
    *   **Schema Application Check:** Ensure the schema migration (if any) can be successfully applied to a clean database instance.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   Schema migration fails to apply successfully.
    *   Unit tests for `wordRepository` fail to create or retrieve a `Word` entity correctly.
    *   Integration tests fail to persist or retrieve data from the test database, indicating a fundamental issue with the persistence layer.
    *   Any unexpected errors or exceptions during the execution of the `createWord` or `getWordById` operations in a controlled test environment.