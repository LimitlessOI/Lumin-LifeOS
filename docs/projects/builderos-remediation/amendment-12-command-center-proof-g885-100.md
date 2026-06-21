<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G885 100. -->

Amendment 12 Command Center Proof - G885-100: Initial GraphQL Task Listing
This proof-closing blueprint note addresses the foundational backend API for the Command Center's task listing feature, aligning with Phase 1 (MVP) of the phased rollout.

1.  **Exact missing implementation or proof gap:**
    The initial GraphQL schema definition for the `Task` type, including its essential fields (`id`, `title`, `status`, `dueDate`, `assigneeId`), and the corresponding root query `tasks` to retrieve a list of these tasks. This also includes the basic resolver implementation to serve this data.

2.  **Smallest safe build slice to close it:**
    a.  Define the `Task` GraphQL object type and the `tasks` query within the primary GraphQL schema definition.
    b.  Implement a placeholder resolver function for the `tasks` query that returns a static array of mock `Task` objects. This ensures the API surface is functional without requiring immediate database integration.

3.  **Exact safe-scope files to touch first:**
    -   `src/graphql/types/task.graphql`: Define the `Task` object type and extend the `Query` type to include `tasks`.
    -   `src/graphql/resolvers/task.js`: Implement the `tasks` query resolver, importing mock data.
    -   `src/graphql/schema.js`: Update to import and merge the `task.graphql` type definitions and `task.js` resolvers into the executable schema.
    -   `src/data/mockTasks.js` (new file): Create a simple module exporting an array of mock `Task` objects for initial resolver implementation.

4.  **Verifier/runtime checks:**
    -   **Schema Compilation Check:** Execute the GraphQL schema validation script (e.g., `npm run graphql:validate-schema`) to confirm the new schema is valid and compiles without errors.
    -   **API Endpoint Test (GraphQL Query):**
        -   **Method:** `POST`
        -   **URL:** `/graphql` (or the configured GraphQL endpoint)
        -   **Body:**
            ```graphql
            query GetTasks {
              tasks {
                id
                title
                status
                dueDate
                assigneeId
              }
            }
            ```
        -   **Expected Response:** A `200 OK` HTTP status with a JSON payload containing `data.tasks` as an array of objects. Each object should conform to the `Task` type structure, populated with the mock data.
    -   **Unit Tests:** Ensure existing or newly added unit tests for GraphQL resolvers pass, specifically for the `tasks` query resolver.

5.  **Stop conditions if runtime truth disagrees:**
    -   The GraphQL schema fails to compile or reports validation errors during the schema compilation check.
    -   The `/graphql` endpoint returns a 5xx HTTP status code for the `GetTasks` query.
    -   The `GetTasks` query returns an empty `data.tasks` array when mock data is expected, or the returned objects do not conform to the `Task` type's expected fields and types.
    -   Any existing GraphQL queries or mutations are broken or return incorrect data due to the schema changes.