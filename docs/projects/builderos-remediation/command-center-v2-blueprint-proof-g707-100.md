### Blueprint Note: g707-100 - Initial Command Entity Definition

This note closes the proof for the initial core type and database schema definition, marking the first concrete build slice for Command Center V2.

1.  **Exact missing implementation or proof gap:**
    The foundational definition of the `Command` entity, encompassing its core type structure within `@lifeos/command-center-core` and its corresponding database table schema within `@lifeos/command-center-db`. This is the prerequisite for any API or UI development.

2.  **Smallest safe build slice to close it:**
    Implement the `ICommand` interface (or similar type definition) in `@lifeos/command-center-core` and create the initial database migration for the `commands` table in `@lifeos/command-center-db`. This slice establishes the core data model.

3.  **Exact safe-scope files to touch first:**
    *   `packages/command-center-core/src/types/command.ts`
    *   `packages/command-center-db/src/migrations/YYYYMMDDHHMMSS_create_commands_table.ts` (where `YYYYMMDDHHMMSS` is a timestamp)

4.  **Verifier/runtime checks:**
    *   Run `npm test` within `packages/command-center-core` to ensure type definitions are valid and pass any linting/compilation checks.
    *   Execute `npm run migrate:latest` within `packages/command-center-db`.
    *   Connect to the development database and verify the `commands` table exists with the expected columns (e.g., `id`, `name`, `description`, `status`, `createdAt`, `updatedAt`).

5.  **Stop conditions if runtime truth disagrees:**
    *   If `npm test` in `packages/command-center-core` fails, indicating issues with the `ICommand` type definition.
    *   If `npm run migrate:latest` in `packages/command-center-db` fails or reports errors, preventing the `commands` table from being created or correctly structured.
    *   If manual database inspection reveals the `commands` table is missing, has incorrect columns, or has unexpected constraints.