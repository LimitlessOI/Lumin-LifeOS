Amendment 16: Word Keeper - Proof Gap G18-100: Core Word Entity Definition

This document outlines the next smallest build slice for the Word Keeper system, focusing on the foundational `Word` entity.

---

### 1. Exact Missing Implementation or Proof Gap

The core data model for the `Word` entity, including its schema definition and basic persistence layer, is currently undefined and unimplemented. This gap prevents the storage and retrieval of individual word units, which are fundamental to the Word Keeper system's functionality.

### 2. Smallest Safe Build Slice to Close It

Implement the `Word` entity's data model and a minimal persistence interface. This includes:
- Defining the `Word` entity schema (e.g., `id`, `text`, `language`, `metadata`, `createdAt`, `updatedAt`).
- Creating a database migration to establish the `words` table.
- Implementing a basic data access object (DAO) or repository for `Word` entities, supporting Create and Read operations.

### 3. Exact Safe-Scope Files to Touch First

- `db/migrations/YYYYMMDDHHMMSS_create_word_table.js` (Node.js/ESM migration script)
- `src/builderos/core/word/WordEntity.js` (ESM module defining the Word entity structure/schema)
- `src/builderos/core/word/WordRepository.js` (ESM module for basic persistence operations)

### 4. Verifier/Runtime Checks

- **Database Schema Check:** Verify that the `words` table exists in the BuilderOS database with the specified columns (`id`, `text`, `language`, `metadata`, `createdAt`, `updatedAt`) and appropriate data types/constraints.
- **Entity Creation Test:** Successfully create a new `Word` entity via `WordRepository.create()` and confirm its persistence in the database.
- **Entity Retrieval Test:** Retrieve the created `Word` entity by its ID via `WordRepository.findById()` and verify that the retrieved data matches the input.
- **Data Integrity Test:** Attempt to create a `Word` with missing required fields (e.g., `text`) and confirm appropriate error handling (e.g., database constraint violation).

### 5. Stop Conditions if Runtime Truth Disagrees

- **Migration Failure:** The database migration script fails to execute or results in an incorrect schema.
- **Persistence Errors:** `WordRepository.create()` or `WordRepository.findById()` operations consistently fail or return corrupted data.
- **Schema Mismatch:** The actual database schema for `words` table deviates from the defined `WordEntity` structure.
- **Performance Degradation:** Basic CRUD operations on `Word` entities introduce unacceptable latency or resource consumption within the BuilderOS loop.
- **Dependency Conflicts:** Introduction of new files or dependencies causes conflicts with existing BuilderOS modules or external libraries.