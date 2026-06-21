<!-- SYNOPSIS: Command Center V2 Blueprint Proof: G136-100 - Database Schema Foundation -->

# Command Center V2 Blueprint Proof: G136-100 - Database Schema Foundation

## Proof-Closing Blueprint Note

This note addresses the foundational database schema requirements for Command Center V2 (C2) Phase 1: Core Dashboard & Task List (MVP), as outlined in `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`. The previous attempt resulted in a verifier rejection due to the `.md` file containing instructions for code generation rather than the proof itself, leading to an `ERR_UNKNOWN_FILE_EXTENSION` when Node.js attempted to execute it. This revision provides the actual blueprint note content.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of a defined and implemented database schema for the core `Task` entity, which is fundamental for the "Task List" component of the C2 MVP. This includes the table definition, column specifications, and the necessary database migration script to establish this schema.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
- Defining the `Task` entity model with essential fields.
- Creating a database migration script to establish the `tasks` table with its initial schema.
- Ensuring the ORM (e.g., TypeORM, Prisma, Sequelize) is configured to recognize and interact with this new entity and migration.

### 3. Exact Safe-Scope Files to Touch First

To implement this slice, the following files are within safe scope and should be touched first:

- `src/db/migrations/001_create_tasks_table.ts`: This file will contain the SQL (or ORM-specific migration logic) to create the `tasks` table.
- `src/modules/tasks/task.model.ts`: This file will define the `Task` entity/model, mapping to the `tasks` table.

### 4. Verifier/Runtime Checks

To confirm successful implementation and integration:

- **Migration Execution:** Run the database migration command (`npm run db:migrate` or equivalent). It must complete successfully without errors.
- **Schema Presence:** Query the database to confirm the `tasks` table exists and has the expected columns (`id`, `title`, `description`, `status`, `userId`, `createdAt`, `updatedAt`).
  - Example SQL: `SELECT * FROM information_schema.tables WHERE table_name = 'tasks';`
  - Example SQL: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks';`
- **ORM Interaction:** Implement and run a basic integration test that uses the `TaskModel` to:
  - Create a new task record.
  - Read the created task record by its ID.
  - Verify the data integrity of the created and read task.

### 5. Stop Conditions if Runtime Truth Disagrees

If any of the verifier/runtime checks fail, the build process must halt. Specific stop conditions include:

- **Migration Failure:** The `npm run db:migrate` command (or equivalent) exits with a non-zero status code, indicating a syntax error, connection issue, or other migration-related problem.
- **Table Absence:** After successful migration command execution, the `tasks` table is not found in the database schema.
- **Incorrect Schema:** The `tasks` table exists, but its columns, types, or constraints do not match the `Task` entity definition.
- **ORM CRUD Failure:** Basic create, read, update, or delete operations using the `TaskModel` fail or return unexpected results, indicating a mismatch