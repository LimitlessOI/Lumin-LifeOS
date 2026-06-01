Amendment 16 Word Keeper Remediation: Proof G35-100
This document outlines the next smallest build slice to close the proof gap for `g35-100` related to Amendment 16 of the Word Keeper system.

1. Exact Missing Implementation or Proof Gap
The Word Keeper service lacks a verified persistence mechanism for critical, predefined words. Specifically, there is no dedicated database table or data access layer (DAL) to store, retrieve, update, and delete these words, nor are there corresponding internal service methods to manage their lifecycle. The current state relies on in-memory definitions, which are not persistent across service restarts or deployments, failing the "verified persistence" requirement for `g35-100`.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice is to implement the foundational persistence for a single "Word" entity. This includes:
    a. Defining the database schema for `word_keeper_words` with essential fields (e.g., `id`, `word_text`, `created_at`, `updated_at`).
    b. Creating a data access layer (DAL) for basic CRUD operations (Create, Read by ID, Read All) for `Word` entities.
    c. Extending the `WordKeeperService` with internal methods to `addWord` and `getWordById` that utilize the new DAL.
    d. Implementing unit tests for the new DAL and service methods to ensure functional correctness.

3. Exact Safe-Scope Files to Touch First
*   `db/migrations/2024XXYY_create_word_keeper_words_table.js`: New database migration script to create the `word_keeper_words` table.
*   `src/data/wordKeeperWordRepository.js`: New module implementing the data access layer for `word_keeper_words`.
*   `src/services/wordKeeperService.js`: Existing service file to be extended with new methods (`addWord`, `getWordById`) that interact with `wordKeeperWordRepository`.
*   `src/models/wordKeeperWord.js`: New or updated module defining the `Word` entity structure.
*   `src/data/wordKeeperWordRepository.test.js`: New unit test file for `wordKeeperWordRepository`.
*   `src/services/wordKeeperService.test.js`: Existing service test file to be extended to cover new persistence methods.

4. Verifier/Runtime Checks
*   **Database Schema Verification:** Execute the migration script and verify the `word_keeper_words` table and its columns exist and match the defined schema using database introspection tools.
*   **Unit Test Pass:** All new and modified unit tests for `wordKeeperWordRepository` and `wordKeeperService` must pass with 100% statement and branch coverage for new code paths.
*   **Integration Test (Local):** Deploy the service locally, use a test client or internal script to call the new `addWord` and `getWordById` methods, and verify that words are correctly stored in and retrieved from the database.
*   **BuilderOS Lint/Type Checks:** Ensure all new and modified code adheres to existing linting rules and passes any configured TypeScript checks without errors.

5. Stop Conditions if Runtime Truth Disagrees
*   **Migration Failure:** If the database migration fails to execute or results in an incorrect or incomplete schema.
*   **Data Integrity Issues:** If words cannot be reliably stored, retrieved, or if data corruption is observed during testing.
*   **Performance Degradation:** If the addition of persistence introduces unacceptable latency or resource consumption for core Word Keeper operations.
*   **Security Vulnerabilities:** If any new security risks related to data storage or access are identified during testing or review.
*   **Conflicting Business Logic:** If the persistence implementation contradicts existing Word Keeper business rules or data models not explicitly captured in this slice, indicating a deeper architectural mismatch.