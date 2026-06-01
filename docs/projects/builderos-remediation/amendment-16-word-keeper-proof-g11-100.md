AMENDMENT 16: WORD KEEPER - Proof-Closing Blueprint Note (G11-100)
This note addresses the initial foundational build slice for Amendment 16, focusing on the db schema implementation.
---
1. Exact Missing Implementation or Proof Gap
The core db schema for the `Word` and `UserWord` entities, as detailed in sections of the `AMENDMENT_16_WORD_KEEPER.md` blueprint, is not yet implemented in the database. This includes table creation, column definitions, and necessary indices/constraints for `Word` (e.g., `id`, `text`, `language`, `createdAt`, `updatedAt`) and `UserWord` (e.g., `id`, `userId`, `wordId`, `status`, `createdAt`, `updatedAt`).

2. Smallest Safe Build Slice to Close It
Implement the database migration to create the `words` and `user_words` tables with their defined schemas. This slice focuses solely on schema definition and does not include any application-level logic for interacting with these tables beyond basic ORM/DB client setup.

3. Exact Safe-Scope Files to Touch First
- `migrations/YYYYMMDDHHMMSS_create_word_user_word_tables.js` (new file, containing Knex.js migration)
- `src/db/models/word.js` (new file, defining the ORM model for `Word` entity)
- `src/db/models/userWord.js` (new file, defining the ORM model for `UserWord` entity)
- `src/db/index.js` (update to register new models with the ORM/DB context, if applicable to existing patterns)

4. Verifier/Runtime Checks
- **Migration Success:** Execute `knex migrate:latest` in a BuilderOS-scoped environment and verify successful completion without errors.
- **Table Existence:** Query the database schema (e.g., `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`) to confirm `words` and `user_words` tables exist.
- **Column Verification:** Inspect `words` and `user_words` tables (e.g., `DESCRIBE words;`) to ensure all specified columns (`id`, `text`, `language`, `createdAt`, `updatedAt` for `words`; `id`, `userId`, `wordId`, `status`, `createdAt`, `updatedAt` for `user_words`) are present with correct types and constraints (e.g., foreign keys, uniqueness).
- **Basic Data Insertion:** Attempt to insert a sample `Word` and `UserWord` record via the ORM/DB client and verify successful persistence and retrieval.

5. Stop Conditions if Runtime Truth Disagrees
- Database migration fails or rolls back unexpectedly.
- Tables or columns are not created exactly as specified in the blueprint.
- Data insertion/retrieval fails or results in unexpected data integrity issues (e.g., foreign key violations, incorrect data types).
- Any observed performance degradation or unexpected side effects on existing BuilderOS database operations.