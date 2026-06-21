<!-- SYNOPSIS: Amendment 12 Command Center Proof G97-100: Initial Data Model & Migration -->

# Amendment 12 Command Center Proof G97-100: Initial Data Model & Migration

This proof-closing blueprint note addresses the foundational data model for the Command Center, specifically covering the definition and persistence of its core entity.

---

### 1. Exact missing implementation or proof gap

The exact missing implementation is the definition of the `CommandCenter` entity's core data model schema and the corresponding database migration to establish its table structure. This forms the bedrock for all subsequent Command Center features.

### 2. Smallest safe build slice to close it

Define the `CommandCenter` data model schema, including essential fields like `id`, `name`, `status`, `ownerId`, `createdAt`, and `updatedAt`. Concurrently, create a Knex database migration script to create the `command_centers` table with these specified columns, ensuring proper indexing for `ownerId`.

### 3. Exact safe-scope files to touch first

*   `src/schemas/commandCenterSchema.js` (for Joi/Zod schema definition)
*   `src/db/migrations/YYYYMMDDHHMMSS_create_command_center_table.js` (Knex migration script)

### 4. Verifier/runtime checks

*   Execute `knex migrate:latest` and confirm successful application of the `create_command_center_table` migration.
*   Connect to the database and verify the existence of the `command_centers` table with the expected columns (`id`, `name`, `status`, `owner_id`, `created_at`, `updated_at`) and appropriate data types/constraints.
*   Write a unit test for `src/schemas/commandCenterSchema.js` that successfully validates a mock `CommandCenter` object conforming to the defined schema.

### 5. Stop conditions if runtime truth disagrees