AMENDMENT 12: COMMAND CENTER - Proof G27-100 Blueprint Note

This note addresses the next smallest blueprint-backed build slice for the AMENDMENT 12: COMMAND CENTER project, focusing on establishing the foundational data model for command states.

---

1.  **Exact missing implementation or proof gap:**
    The blueprint specifies "Initial DB schema for command states" as a foundational requirement. The exact gap is the definition and application of this schema within the BuilderOS database, specifically for tracking the lifecycle and properties of commands. This includes table creation, column definitions, and basic indexing for `builder_command_states`.

2.  **Smallest safe build slice to close it:**
    Define and apply the initial `builder_command_states` database table. This slice focuses solely on the persistent storage layer for command metadata, without implementing any command execution logic or API endpoints.

3.  **Exact safe-scope files to touch first:**
    *   `db/migrations/builder/YYYYMMDDHHmmss_create_builder_command_states_table.js` (e.g., using a timestamp for migration naming)
    *   `src/builder/models/builderCommandState.js` (for a basic ORM model, if applicable, to represent the table)

4.  **Verifier/runtime checks:**
    *   **Migration Success:** Execute `npx sequelize-cli db:migrate` (or equivalent) and confirm successful application.
    *   **Schema Validation:** Connect to the BuilderOS database and verify the `builder_command_states` table exists with expected columns (`id`, `command_id`, `state`, `created_at`, `updated_at`, etc.) and appropriate types/constraints.
    *   **Basic Model CRUD:** If a model is created, write a simple integration test to `INSERT` and `SELECT` a record using the `builderCommandState` model to ensure basic data persistence and retrieval.

5.  **Stop conditions if runtime truth disagrees:**
    *   Migration fails to apply due to syntax errors, dependency issues, or conflicts.
    *   The `builder_command_states` table is not created or lacks expected columns/indices after migration.
    *   Basic model operations (create/read) fail, indicating a mismatch between the model definition and the actual schema or ORM configuration.
    *   Any unintended side effects or data integrity issues are detected in existing BuilderOS database tables.