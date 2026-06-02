# Blueprint Proof: Command Center V2 - Task Management Core CRUD (g826-100)

This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, specifically targeting the foundational elements of Task Management as outlined in `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`. This proof focuses on establishing the core data model and basic GraphQL API for the `Task` entity.

---

## Blueprint Note: Task Management Core CRUD Foundation

**1. Exact Missing Implementation or Proof Gap:**
The initial data model definition and corresponding GraphQL API endpoints for the `Task` entity are missing. This includes the database schema, ORM model, GraphQL type definitions, and basic query/mutation resolvers.

**2. Smallest Safe Build Slice to Close It:**
Implement the foundational `Task` entity, enabling basic creation and retrieval. This slice establishes the necessary database table, ORM model, GraphQL schema (`Task` type, `tasks` query, `createTask` mutation), and their respective resolvers.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/db/migrations/<timestamp>-create-task-table.js`: Database migration to create the `tasks` table.
*   `src/models/Task.js`: Sequelize (or equivalent ORM) model definition for the `Task` entity.
*   `src/schema/task.graphql`: GraphQL schema definition for `Task` type, `Query.tasks`, and `Mutation.createTask`.
*   `src/resolvers/task.js`: GraphQL resolvers for `tasks` query and `createTask` mutation.
*   `src/index.js` (or `src/server.js`): Integration point to load the new `task.graphql` schema and `task.js` resolvers into the main GraphQL server instance.

**4. Verifier/Runtime Checks:**
*   **Database Migration Check:**
    *   Run `npx sequelize-cli db:migrate`. Verify `tasks` table is created in the database with `id`, `title`, `description`, `status`, `createdAt`, `updatedAt` columns.
*   **GraphQL API Check (via GraphQL Playground/Insomnia/Postman):**
    *   **Mutation:** Execute `createTask` to add a new task.
        ```graphql
        mutation CreateNewTask {
          createTask(title: "Implement Task Model", description: "Define DB schema, ORM, and GraphQL types for Task.") {
            id
            title
            status
            createdAt
          }
        }
        ```
        Expected outcome: Returns the `id`, `title`, `status`, and `createdAt` of the newly created task.
    *   **Query:** Execute `tasks` to retrieve all tasks.
        ```graphql
        query GetAllTasks {
          tasks {
            id
            title
            description
            status
            createdAt
            updatedAt
          }
        }
        ```
        Expected outcome: Returns an array containing the task created in the previous step.
*   **Server Logs:** Monitor server startup logs for any schema parsing errors or resolver binding issues.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If `npx sequelize-cli db:migrate` fails or does not create the `tasks` table as expected.
*   If the GraphQL server fails to start due to errors related to `task.graphql` or `task.js`.
*   If the `createTask` mutation returns an error or does not persist the task data to the database.
*   If the `tasks` query returns an empty array or an error when tasks are known to exist in the database.
*   If the returned data structure from GraphQL queries/mutations does not match the defined `Task` type.