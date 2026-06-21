<!-- SYNOPSIS: Amendment 16: Word Keeper - Proof G44-100 -->

# Amendment 16: Word Keeper - Proof G44-100

## Proof-Closing Blueprint Note

This note addresses the next smallest blueprint-backed build slice for Amendment 16: Word Keeper.

1.  **Exact missing implementation or proof gap:**
    The foundational persistence layer for the `Word` entity is missing. Specifically, the database migration to create the `words` table, as defined by the blueprint's data model, has not been implemented. This table is essential for storing `Word` records and enabling all subsequent CRUD operations.

2.  **Smallest safe build slice to close it:**
    Implement the database migration to create the `words` table with all specified columns, data types, constraints, and default values.

3.  **Exact safe-scope files to touch first:**
    -   `src/db/migrations/YYYYMMDDHHMMSS_create_words_table.js` (create new migration file)
    -   `src/db/knexfile.js` (verify migration path configuration, if not already standard)

4.  **Verifier/runtime checks:**
    -   Execute the migration: `npx knex migrate:latest`
    -   Verify migration status: `npx knex migrate:status` (should show the new migration as "completed")
    -   Inspect database schema: Connect to the database and confirm the `words` table exists with the following columns and properties:
        -   `id` (UUID, primary key, not null, default `gen_random_uuid()`)
        -   `key` (VARCHAR(255), not null, unique)
        -   `value` (VARCHAR(4096), not null)
        -   `version` (INTEGER, not null, default `1`)
        -   `created_at` (TIMESTAMP, not null, default `now()`)
        -   `updated_at` (TIMESTAMP, not null, default `now()`)
        -   `deleted_at` (TIMESTAMP, nullable)
    -   Perform a basic insert via a temporary script or