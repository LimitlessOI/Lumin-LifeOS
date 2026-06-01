Amendment 09: Life Coaching Integration - Proof G19-100

This proof-closing blueprint note addresses the initial foundational step for integrating Life Coaching features, specifically focusing on the core `LifeCoach` entity's persistence layer.

1.  Exact Missing Implementation or Proof Gap:
    The foundational database schema for the `LifeCoach` entity is not yet defined or applied. This includes the table creation and definition of essential columns such as `id` (primary key), `name` (string), `email` (string, unique), `status` (enum/string, e.g., 'active', 'inactive'), `created_at` (timestamp), and `updated_at` (timestamp).

2.  Smallest Safe Build Slice to Close It:
    Implement a database migration script to create the `life_coach` table with the necessary columns, appropriate data types, and indexing. This migration should be idempotent and reversible.

3.  Exact Safe-Scope Files to Touch First:
    -   `src/db/migrations/YYYYMMDDHHMMSS_create_life_coach_table.js` (e.g., `20240723100000_create_life_coach_table.js`)
    -   `src/db/schema.js` (if a centralized schema definition or ORM model registration is required)

4.  Verifier/Runtime Checks:
    -   Execute the migration script in a local development or staging environment.
    -   Connect to the database and verify the existence of the `life_coach` table using database introspection queries (e.g., `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'life_coach');` for PostgreSQL/MySQL, or `PRAGMA table_info(life_coach);` for SQLite).
    -   Verify the table's column structure, ensuring all specified columns (`id`, `name`, `email`, `status`, `created_at`, `updated_at`) are present with correct data types and constraints (e.g., `id` as primary key, `email` as unique).
    -   Attempt to insert a dummy record into the `life_coach` table and verify successful insertion and retrieval to confirm write/read functionality.

5.  Stop Conditions if Runtime Truth Disagrees:
    -   The migration script fails to execute successfully (e.g., syntax errors, database connection issues, constraint violations).
    -   The `life_coach` table does not appear in the database schema after the migration is applied.
    -   The `life_coach` table exists but is missing critical columns or has incorrect data types/constraints.
    -   Attempting to insert or retrieve data from the `life_coach` table results in a database error, indicating schema or access issues.