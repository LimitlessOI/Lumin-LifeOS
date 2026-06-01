Amendment 16: Word Keeper - Proof Gap G12-100
This document outlines the next smallest build slice for Amendment 16, focusing on establishing the foundational data model for the `Word` entity.

---

Proof-Closing Blueprint Note

1.  **Exact missing implementation or proof gap:**
    The `Word` data model (schema) is not defined or persisted. Specifically, the database schema for the `Word` entity and its corresponding ORM/data access layer definition are missing. This includes the table creation, column definitions, and the basic ORM model to interact with it.

2.  **Smallest safe build slice to close it:**
    Define the `Word` entity schema in the database migration system and create a basic ORM model/interface for it. This slice focuses solely on schema definition and basic data access scaffolding, without implementing any business logic or API endpoints. The `Word` entity will initially contain `id`, `text`, `language`, `created_at`, and `updated_at` fields.

3.  **Exact safe-scope files to touch first:**
    *   `db/migrations/YYYYMMDDHHMMSS_create_word_table.js` (for database schema definition)
    *   `src/data/models/Word.js` (for ORM model definition, extending existing base model patterns)

4.  **Verifier/runtime checks:**
    *   Database migration `YYYYMMDDHHMMSS_create_word_table.js` runs successfully in a test environment.
    *   Verify the `words` table exists in the database with `id` (PK), `text` (string), `language` (string), `created_at` (timestamp), and `updated_at` (timestamp) columns.
    *   Unit tests for `src/data/models/Word.js` pass, confirming the model can be instantiated and basic operations (e.g., `Word.create({ text: 'hello', language: 'en' })`, `Word.findById(1)`) function correctly against a test database or mock.

5.  **Stop conditions if runtime truth disagrees:**
    *   Database migration fails to apply or rolls back.
    *   The `words` table or any of its specified columns are not present or incorrectly typed after migration.
    *   ORM model instantiation or basic CRUD operations (create, find) throw errors or return unexpected results in the test environment.
    *   Significant performance degradation is observed during migration or basic data access operations.