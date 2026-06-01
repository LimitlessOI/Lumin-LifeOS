Amendment 16: Word Keeper - Proof G16-100
This document outlines the next smallest build slice for the Word Keeper feature, focusing on establishing the foundational capability to create and persist a new `Word` entity.
---

### 1. Exact Missing Implementation or Proof Gap

The core capability to create and persist a new `Word` entity is currently unimplemented. Specifically, there is no defined data model (schema) for a `Word` entity, nor are there any service or repository functions to handle the creation, validation, and persistence of a `Word` object into the underlying data store. This gap prevents any higher-level features from interacting with `Word` data.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves defining the `Word` entity schema and implementing a basic `createWord` function within a dedicated service layer. This function will handle data validation and persistence to the database. This slice focuses solely on the foundational data structure and its initial persistence mechanism, without exposing it via an API endpoint yet.

### 3. Exact Safe-Scope Files to Touch First

*   `src/models/word.js`: Define the Mongoose (or similar ORM) schema and model for the `Word` entity. This will include fields such as `text` (string, required, unique), `language` (string, required), `createdAt`, and `updatedAt`.
*   `src/services/wordService.js`: Create a new service file to encapsulate `Word`-related business logic. Implement an `async function createWord(wordData)` that validates `wordData` against the `Word` model and saves it to the database.
*   `src/services/wordService.test.js`: Add unit tests for the `createWord` function, covering successful creation, validation failures, and duplicate word handling.

### 4. Verifier/Runtime Checks

*   **Unit Tests:** All tests in `src/services/wordService.test.js` must pass, specifically verifying:
    *   Successful creation of a new `Word` with valid data.
    *   Rejection/error handling for invalid `wordData` (e.g., missing `text`, `language`).
    *   Rejection/error handling for attempting to create a duplicate `Word` (if `text` is unique).
*   **Manual Service Call (Dev Environment):** Directly invoke `wordService.createWord({ text: 'hello', language: 'en' })` from a Node.js REPL or a temporary script to confirm database persistence.
*   **Database Inspection:** Verify that the `Word` entity is correctly stored in the database with all expected fields and values after a successful `createWord` call.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Test Failures:** Any unit test in `src/services/wordService.test.js` fails or reports unexpected behavior.
*   **Persistence Failure:** The `createWord` function resolves successfully but the `Word` entity is not found in the database, or its data is corrupted/incomplete.
*   **Validation Bypass:** The `createWord` function allows invalid or duplicate `Word` data to be persisted without error.
*   **Unhandled Exceptions:** The `createWord` function throws unhandled exceptions during execution.