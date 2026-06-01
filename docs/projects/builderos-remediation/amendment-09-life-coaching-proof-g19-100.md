Amendment 09: Life Coaching Integration - Proof G19-100

This proof-closing blueprint note addresses the initial foundational step for integrating Life Coaching features, specifically focusing on the core `LifeCoach` entity's persistence layer.

1.  Exact Missing Implementation or Proof Gap:
    The foundational db schema for the `LifeCoach` entity is not yet defined or implemented within the database migration system. This includes the creation of the `life_coaches` table, its essential column definitions (e.g., `id`, `uuid`, `name`, `email`, `status`, `created_at`, `updated_at`), and any necessary indices.

2.  Smallest Safe Build Slice to Close It:
    Define and apply a database migration to create the `life_coaches` table with its core schema. This slice focuses exclusively on establishing the persistent storage for `LifeCoach` entities, ensuring the database structure is in place before any application-level logic or ORM models are introduced.

3.  Exact Safe-Scope Files to Touch First:
    - `src/db/migrations/YYYYMMDDHHMMSS_create_life_coaches_table.js` (new file, e.g., using Knex.js or similar migration tool)

4.  Verifier/Runtime Checks:
    -   Successful execution of the `create_life_coaches_table` database migration script.
    -   Database introspection (e.g., `\d life_coaches` in psql, or `PRAGMA table_info(life_coaches)` in SQLite) confirms the `life_coaches` table exists with the specified columns and types.
    -   A basic database query (e.g., `SELECT 'OK' FROM life_coaches LIMIT 1;`) executes without error, confirming table accessibility.

5.  Stop Conditions if Runtime Truth Disagrees:
    -   The database migration fails to apply or rolls back.
    -   The `life_coaches` table is not found in the database after the migration is reported as successful.
    -   The schema of the `life_coaches` table (columns, types, constraints) does not match the definitions specified in the migration.
    -   Any attempt to query the `life_coaches` table results in a database error (e.g., table not found, permission denied).