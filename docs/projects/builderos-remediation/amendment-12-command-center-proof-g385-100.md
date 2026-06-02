# Amendment 12: Command Center - Proof G385-100

This document serves as a proof-closing blueprint note for the initial build slice related to Amendment 12, focusing on the foundational persistence layer for the Command Center.

---

### Blueprint Note: Initial CommandCenterDB Schema Definition

**1. Exact missing implementation or proof gap:**
The initial definition and migration of the `CommandCenterDB` schema for basic task and state management. This foundational persistence layer is required before any service logic can store or retrieve data, aligning with Phase 1 of the Amendment 12 blueprint.

**2. Smallest safe build slice to close it:**
Define and apply the initial database schema for `CommandCenterDB`, specifically for `command_center_tasks` and `command_center_task_states` tables. This involves creating the necessary migration files and ensuring their successful application to the target database.

**3. Exact safe-scope files to touch first:**
-   `src/db/migrations/001_create_command_center_tables.js`
-   `src/db/knexfile.js` (if not already present or requiring updates for the Command Center database connection)

**4. Verifier/runtime checks:**
-   Execute database migrations: `npx knex migrate:latest` (assuming Knex.js for migrations).
-   Connect to the target database and verify the existence of `command_center_tasks` and `command_center_task_states` tables.
-   Inspect the schema of these tables to confirm columns like `id`, `status`, `type`, `payload` (JSONB), `created_at`, `updated_at` are present and correctly typed.

**5. Stop conditions if runtime truth disagrees:**
-   The `npx knex migrate:latest` command fails with any error (