# Amendment 12: Command Center - Proof G32-100

## Blueprint Note: Initial Database Schema for Command Center Tasks

This note closes the proof for the initial database schema definition for the Command Center, specifically focusing on the core `command_center_tasks` table. This establishes the foundational persistence layer required for the `CommandCenterService` to manage and track operations.

### 1. Exact Missing Implementation or Proof Gap

The `CommandCenterDB` component is specified to store state and history. The current gap is the concrete definition and implementation of the initial database schema for tracking individual Command Center tasks. This includes defining the primary table and its essential columns.

### 2. Smallest Safe Build Slice to Close It

Implement the initial database migration script to create the `command_center_tasks` table. This table will store basic information about each task managed by the Command Center, such as its ID, type, current status, and timestamps.

### 3. Exact Safe-Scope Files to Touch First

-   `src/db/migrations/001_create_command_center_tasks_table.js`

### 4. Verifier/Runtime Checks

1.  Execute the database migration system (e.g., `npx knex migrate:latest` or equivalent for the project's chosen ORM/migration tool).
2.  Connect to the database and verify the existence of the `command_center_tasks` table.
3.  Inspect the `command_center_tasks` table schema to confirm it contains at least the following columns with appropriate types:
    -   `id` (UUID/PK)
    -   `type` (VARCHAR)
    -   `status` (VARCHAR, e.g., 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')
    -   `payload` (JSONB, for task-specific data)
    -   `created_at` (TIMESTAMP with default NOW())
    -   `updated_at` (TIMESTAMP with default NOW() and ON UPDATE NOW())

### 5. Stop Conditions if Runtime Truth Disagrees

-   The migration script fails to execute successfully (e.g., syntax errors, database connection