# Amendment 12 Command Center Proof: G77-100 - Core Data Model & Persistence (Task Entity)

This document outlines the proof-closing blueprint note for the initial data model and persistence layer for the BuilderOS Command Center, specifically focusing on the `Task` entity.

---

### Proof-Closing Blueprint Note

1.  **Exact missing implementation or proof gap:**
    The foundational data model and persistence layer for the BuilderOS Command Center are not yet established. Specifically, the PostgreSQL schema and Sequelize ORM model for core entities, starting with `Task`, are missing. This gap prevents any data storage, retrieval, or management capabilities for Command Center tasks.

2.  **Smallest safe build slice to close it:**
    Implement the initial PostgreSQL schema migration and Sequelize ORM model definition for the `Task` entity. This provides the essential data structure for managing tasks within the Command Center, enabling subsequent API and UI development.

3.  **Exact safe-scope files to touch first:**
    *   `src/db/migrations/YYYYMMDDHHMMSS-create-task.js` (Sequelize migration for `tasks` table)
    *   `src/db/models/task.js` (Sequelize model definition for `Task`)
    *   `src/db/index.js` (Ensure `Task` model is loaded by Sequelize instance)

4.  **Verifier/runtime checks:**
    *   Execute `npx sequelize db:migrate` and confirm successful migration output.
    *   Connect to the PostgreSQL database and verify the existence of the `tasks` table with the expected columns (`id`, `name`, `description`, `status`, `assignedTo`, `createdAt`, `updatedAt`, etc.) and correct data types.
    *   Write and execute a temporary script or unit test that uses the `Task` Sequelize model to:
        *   Create a new task record.
        *   Retrieve the created task by ID.
        *   Update a field of the task.
        *   Delete the task record.
    *   Verify that all CRUD operations complete successfully and data integrity is maintained in the database.

5.  **Stop conditions if runtime truth disagrees:**
    *   The `npx sequelize db:migrate` command fails or reports errors during execution.
    *   The `tasks` table is not created in the database, or its schema (columns, types, constraints) does not match the migration definition.
    *   Any of the CRUD operations (create, read, update, delete) performed via the `Task` Sequelize model fail, throw errors, or do not correctly persist/retrieve data from the database.
    *   Database connection errors occur when attempting to interact with the `Task` model.