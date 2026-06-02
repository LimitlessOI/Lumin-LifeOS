# Blueprint Proof: Command Center V2 - Core Model & Persistence (G469-100)

This document serves as a proof-closing note for the initial build slice of the Command Center V2 blueprint, specifically addressing the foundational data models and persistence.

---

## Blueprint Note: Core Command Model & Persistence

**1. Exact Missing Implementation or Proof Gap:**
The core data models for `CommandDefinition` and `CommandInstance` are not yet defined or persisted within the LifeOS database. This foundational layer is critical for all subsequent phases of Command Center V2.

**2. Smallest Safe Build Slice to Close It:**
Define and implement the database schema and ORM models for `CommandDefinition` and `CommandInstance`. This includes creating the necessary migration files to establish the tables and their relationships, and the corresponding Sequelize model definitions.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/db/models/CommandDefinition.js` (new file)
*   `src/db/models/CommandInstance.js` (new file)
*   `src/db/migrations/<timestamp>-create-command-definition.js` (new file)
*   `src/db/migrations/<timestamp>-create-command-instance.js` (new file)
*   `src/db/index.js` (to integrate and export the new models)

**4. Verifier/Runtime Checks:**
*   **Migration Success:** Execute `npx sequelize db:migrate` and verify that both `create-command-definition` and `create-command-instance` migrations apply successfully without errors.
*   **Model Instantiation:** In a test or REPL environment, verify that `CommandDefinition` and `CommandInstance` models can be imported and instantiated without throwing errors.
*   **Basic CRUD (CommandDefinition):**
    *   Create a new `CommandDefinition` record.
    *   Retrieve the created `CommandDefinition` by ID.
    *   Verify its properties match the input.
*   **Basic CRUD (CommandInstance with FK):**
    *   Create a `CommandDefinition` first.
    *   Create a new `CommandInstance` record, linking it to the `CommandDefinition` via `commandDefinitionId`.
    *   Retrieve the created `CommandInstance` and verify its properties, including the foreign key relationship.
    *   Attempt to create a `CommandInstance` with a non-existent `commandDefinitionId` and confirm it fails due to foreign key constraint.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   Database migration fails to apply for either `CommandDefinition` or `CommandInstance` tables.
*   ORM model instantiation or basic operations (create, find) throw unexpected errors.
*   Database connection issues prevent any model operations.
*   Foreign key constraints between `CommandInstance` and `CommandDefinition` fail to enforce correctly during `CommandInstance` creation (e.g., allows creation with invalid `commandDefinitionId`).
*   The created tables or their columns do not match the specified schema (e.g., missing fields, incorrect data types).

---

This proof closes the initial gap for core model persistence, setting the stage for subsequent phases involving command execution and UI integration. The next build pass should focus on implementing the basic CRUD operations for `CommandDefinition` via an API, as outlined in Phase 1 of the blueprint.