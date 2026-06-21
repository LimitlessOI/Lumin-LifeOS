<!-- SYNOPSIS: Documentation — Amendment 16 Word Keeper Proof G141 100. -->

AMENDMENT 16 WORD KEEPER - Proof G141-100: Foundational Data Model and Persistence
This proof-closing blueprint note addresses the initial foundational build slice for the Word Keeper feature, focusing on establishing the core data model and its persistence layer.
1.  Exact missing implementation or proof gap:
    The foundational data model for `Word` entities and their persistence mechanism are not yet established. This includes the definition of the `Word` entity, the db schema for storing words, and a basic repository for interacting with this data.
2.  Smallest safe build slice to close it:
    Implement the `Word` data model (entity/interface), create the necessary db migration to add the `words` table, and develop a basic `WordRepository` capable of creating and retrieving `Word` entities. This slice provides the essential persistence backbone without exposing any external API or complex business logic.
3.  Exact safe-scope files to touch first:
-   `src/modules/word-keeper/domain/word.entity.ts` (Defines the `Word` entity structure)
-   `src/modules/word-keeper/domain/word.repository.interface.ts` (Defines the contract for `WordRepository`)
-   `src/modules/word-keeper/infrastructure/persistence/migrations/YYYYMMDDHHMMSS-create-words-table.ts` (Database migration to create the `words` table)
-   `src/modules/word-keeper/infrastructure/persistence/word.repository.ts` (Implementation of `WordRepository` using the chosen ORM/DB client)
-   `src/modules/word-keeper/word-keeper.module.ts` (Registers the `WordRepository` for dependency injection)
-   `src/modules/word-keeper/application/services/word.service.ts` (Basic service to orchestrate repository operations, if needed for testing)
-   `src/modules/word-keeper/infrastructure/persistence/word.repository.spec.ts` (Unit/integration tests for the repository)
4.  Verifier/runtime checks:
-   Database Schema Verification: After migration execution, query the db to confirm the `words` table exists with the expected columns (`id`, `text`, `definition`, `language`, `createdAt`, `updatedAt`, etc.) and correct data types.
-   Repository Functionality Test: Execute unit/integration tests for `WordRepository.create()` and `WordRepository.findById()`. Verify that a `Word` entity can be successfully persisted to the db and then retrieved with all its properties intact and matching the original input.
-   Migration Idempotency: Run the migration multiple times in a test environment to ensure it's idempotent and doesn't cause errors on subsequent runs.
5.  Stop conditions if runtime truth disagrees:
-   Migration Failure: If the db migration fails to apply, rolls back, or creates an incorrect or incomplete schema for the `words` table.
-   Repository Test Failure: If `WordRepository` methods (e.g., `create`, `findById`) fail to correctly persist or retrieve data, indicating a mismatch between the entity, repository logic, or db schema.
-   Data Integrity Issues: If retrieved `Word` data shows corruption, unexpected type conversions, or missing fields compared to the data that was initially stored.