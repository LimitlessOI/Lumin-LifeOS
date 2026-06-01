# Amendment 16: Word Keeper - Proof G33-100

## Blueprint Note: Core Word Model Definition

This document outlines the next smallest build slice for Amendment 16, focusing on establishing the foundational data model for the "Word Keeper" functionality.

### 1. Exact Missing Implementation or Proof Gap

The core data model for a `Word` entity, including its properties and persistence schema, is currently undefined. This gap prevents any further implementation of word storage, retrieval, or management features.

### 2. Smallest Safe Build Slice to Close It

Define the `Word` entity interface/class and its corresponding database schema. Implement a minimal repository interface and a basic concrete implementation capable of creating and retrieving a single `Word` entry. This slice establishes the fundamental data structure and persistence mechanism without exposing any user-facing features.

### 3. Exact Safe-Scope Files to Touch First

*   `src/domain/word/Word.ts`: Define the `Word` interface/type.
*   `src/infrastructure/persistence/schemas/WordSchema.ts`: Define the database schema for `Word` (e.g., Mongoose schema, TypeORM entity).
*   `src/infrastructure/persistence/repositories/IWordRepository.ts`: Define the `IWordRepository` interface with `create` and `findById` methods.
*   `src/infrastructure/persistence/repositories/WordRepository.ts`: Implement `WordRepository` using the chosen persistence layer.

### 4. Verifier/Runtime Checks

*   **Unit Test:** Verify that `WordRepository.create()` successfully persists a new `Word` object to the database.
*   **Unit Test:** Verify that `WordRepository.findById()` successfully retrieves a previously created `Word` object by its ID, and that its properties match the original.
*   **Integration Test:** Spin up a minimal application context, create a `Word` via the repository, and then retrieve it, asserting data integrity.
*   **Schema Validation:** Ensure that attempts to create `Word` objects with missing required fields (e.g., `text`) are rejected by the persistence layer.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `WordRepository.create()` throws an unexpected error during persistence.
*   If `WordRepository.findById()` returns `null` or an empty object for a `Word` that was confirmed to be created.
*   If the retrieved `Word` object's properties (e.g., `id`, `text`, `createdAt`) do not match the values provided during creation.
*   If schema validation errors prevent basic `Word` creation, indicating an issue with `WordSchema.ts`.