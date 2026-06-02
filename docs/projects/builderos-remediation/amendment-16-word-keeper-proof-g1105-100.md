Amendment 16: Word Keeper - Proof G1105-100
Blueprint Note: Next Smallest Build Slice

This document outlines the next smallest, blueprint-backed build slice for the "Word Keeper" feature as described in `docs/projects/AMENDMENT_16_WORD_KEEPER.md`. The focus is on establishing the foundational data model.

### 1. Exact Missing Implementation or Proof Gap
The core data model for the "Word" entity, including its schema definition and persistence mechanism, is currently undefined within the BuilderOS ecosystem. This gap prevents any subsequent feature development that relies on storing and retrieving word data.

### 2. Smallest Safe Build Slice to Close It
Define the `Word` entity schema and implement its initial database migration. This slice focuses solely on establishing the persistent data structure without introducing any business logic or API endpoints.

### 3. Exact Safe-Scope Files to Touch First
-   `src/data/entities/Word.entity.ts`: Define the TypeORM/database entity for `Word` with properties like `id` (UUID), `word` (string, unique), `definition` (string), `createdAt` (timestamp), `updatedAt` (timestamp).
-   `src/data/migrations/1700000000000-CreateWordTable.ts`: Generate and implement the database migration script to create the `words` table based on `Word.entity.ts`.
-   `src/data/repositories/WordRepository.ts`: Create a basic TypeORM repository for `Word` to enable fundamental CRUD operations (e.g., `save`, `findOneBy`, `find`, `delete`).

### 4. Verifier/Runtime Checks
-   **BuilderOS Schema Validation**: Verify that `src/data/entities/Word.entity.ts` is correctly parsed and validated by BuilderOS's schema tooling, confirming entity structure and relationships.
-   **Database Migration Success**: Confirm that the `1700000000000-CreateWordTable.ts` migration executes successfully against a test database instance, resulting in the creation of the `words` table with the expected columns and constraints.
-   **Basic Repository Functionality**: Implement and run a unit/integration test for `WordRepository.ts` to ensure a `Word` entity can be successfully created, retrieved by ID, updated, and deleted. This includes testing for unique constraint violations on the `word` field.

### 5. Stop Conditions if Runtime Truth Disagrees
-   If BuilderOS schema validation fails for `Word.entity.ts` (e.g., syntax errors, invalid decorators, missing types, or conflicts with existing schema).
-   If the database migration `1700000000000-CreateWordTable.ts` fails to apply, rolls back, or results in an incorrect table schema (e.g., missing columns, incorrect data types, or constraint failures).
-   If any basic CRUD operation (create, read, update, delete) performed via `WordRepository` fails or produces unexpected results (e.g., data corruption, inability to persist, or incorrect retrieval).