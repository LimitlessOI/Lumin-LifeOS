AMENDMENT 16: Word Keeper - Proof G21-100

This proof-closing blueprint note addresses the initial foundational build slice for the Word Keeper functionality, focusing on establishing the core data model and basic CRUD operations for `WordEntry` resources.

1.  **Exact missing implementation or proof gap:**
    The fundamental database schema for `WordEntry` resources is not yet defined or migrated. This includes the table structure, column definitions (e.g., `id`, `word`, `definition`, `language`, `createdAt`, `updatedAt`), and appropriate indexing. Without this, no data persistence for Word Keeper is possible.

2.  **Smallest safe build slice to close it:**
    Define the `WordEntry` database schema and implement the initial database migration script to create the `word_entries` table. Concurrently, create a basic `WordEntry` interface/type definition in the application layer to reflect this schema. This slice focuses solely on data persistence foundation, without exposing any API endpoints or UI.

3.  **Exact safe-scope files to touch first:**
    -   `src/db/migrations/YYYYMMDDHHMMSS_create_word_entries_table.js` (new file, Node/ESM migration script)
    -   `src/types/WordEntry.ts` (new file, TypeScript interface for `WordEntry` data structure)
    -   `src/db/models/WordEntry.js` (new file, basic ORM/DB access layer for `WordEntry`)

4.  **Verifier/runtime checks:**
    -   Execute `npm run db:migrate` (or equivalent command) to apply the new migration. Verify the command completes successfully without errors.
    -   Connect to the database and confirm the `word_entries` table exists with the expected columns (`id`, `word`, `definition`, `language`, `createdAt`, `updatedAt`) and appropriate data types/constraints.
    -   Run a simple database query (e.g., `INSERT INTO word_entries (word, definition, language) VALUES ('test', 'a test word', 'en');` followed by `SELECT * FROM word_entries;`) to confirm basic CRUD operations are functional at the database level.
    -   Ensure no existing database tables or data are altered or corrupted.
    -   Monitor system logs for any unexpected errors or warnings during migration and basic operations.

5.  **Stop conditions if runtime truth disagrees:**
    -   The database migration fails to apply or rolls back unexpectedly.
    -   The `word_entries` table is not created, or its schema deviates from the specification (missing columns, incorrect types, etc.).
    -   Existing database functionality (e.g., other LifeOS or TSOS data access) is disrupted or shows errors.
    -   Significant performance degradation is observed in database operations.
    -   Any security vulnerabilities are identified during schema review or initial data operations.