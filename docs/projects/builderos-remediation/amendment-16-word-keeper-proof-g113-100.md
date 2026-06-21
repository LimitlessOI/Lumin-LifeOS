<!-- SYNOPSIS: Amendment 16: Word Keeper - Proof G113-100 -->

# Amendment 16: Word Keeper - Proof G113-100

## Blueprint Note: Next Smallest Build Slice

This note addresses the immediate, smallest, and safest build slice required to advance the Word Keeper implementation as defined in `docs/projects/AMENDMENT_16_WORD_KEEPER.md`. The focus is on establishing the foundational data model and persistence layer, adhering to existing LifeOS patterns.

### 1. Exact Missing Implementation or Proof Gap

The `WordEntry` data model, as specified in the blueprint, lacks concrete implementation within the LifeOS persistence layer. Specifically, the ORM model definition and the corresponding database schema migration are missing. This gap prevents any service or API development from proceeding, as the core data structure is not yet established or integrated.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice is to implement the `WordEntry` ORM model and create a database migration to establish the `word_entries` table in the LifeOS database. This slice focuses solely on data persistence, without touching API endpoints or service logic, ensuring minimal impact and clear separation of concerns.

### 3. Exact Safe-Scope Files to Touch First

*   **`src/models/WordEntry.js`**: Create a new file defining the `WordEntry` ORM model, mapping its properties to database columns and integrating with the existing ORM framework (e.g., Sequelize, Objection.js, Knex model).
*   **`src/data/migrations/YYYYMMDDHHMMSS_create_word_entries_table.js`**: Create a new database migration file to define the `word_entries` table schema, including `id`, `word`, `category`, `created_at`, `updated_at`, `created_by`, and `status` columns. The timestamp `YYYYMMDDHHMMSS` should be replaced with the actual generation time.

### 4. Verifier/Runtime Checks

*   **Migration Execution**: Run the database migration command (e.g., `npm run migrate up` or `knex migrate latest`). Verify that the migration completes successfully without errors.
*   **Database Schema Inspection**: Connect to the LifeOS database and confirm the existence of the `word_entries` table. Verify that all specified columns (`id`, `word`, `category`, `created_at`, `updated_at`, `created_by`, `status`) are present with appropriate data types and constraints (e.g., `id` as primary key, `word` as unique/indexed, timestamps auto-managed).
*   **Basic ORM Interaction Test**: Write a temporary, isolated test script or use a REPL to perform basic CRUD operations using the `WordEntry` model:
    *   `WordEntry.create({ word: 'test', category: 'general', created_by: 'system', status: 'active' })`
    *   `WordEntry.findAll()`
    *   `WordEntry.findByPk(id)`
    *   Verify that data can be successfully inserted, retrieved, and that the model correctly maps to the database.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Migration Failure**: If the `create_word_entries_table` migration fails to apply or rolls back, stop immediately. This indicates a schema definition issue, a