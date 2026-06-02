# BuilderOS Remediation: Command Center V2 Blueprint Proof (G663-100)

## Blueprint Note: Phase 1 - API Foundation (G663-100) - Proof Closing

This note closes the initial proof for Phase 1, focusing on establishing the foundational GraphQL API.

### 1. Exact Missing Implementation or Proof Gap

The core GraphQL API for BuilderOS entities is not yet defined or implemented. Specifically, the schema definition and a basic resolver for a core entity like `Project` are missing, which is required to achieve the Phase 1 proof goal of "Successful execution of a basic GraphQL query/mutation against a BuilderOS entity via the new API."

### 2. Smallest Safe Build Slice to Close It

Define the `Project` type in the GraphQL schema and implement a resolver for a simple query like `project(id: ID!): Project` that fetches project data. This slice will establish the basic API structure and demonstrate connectivity to underlying BuilderOS data (initially via a mock or direct `builder-cli` integration).

### 3. Exact Safe-Scope Files to Touch First

*   `src/builder-api/schema/project.graphql`: Define the GraphQL `Project` type and its associated queries.
*   `src/builder-api/resolvers/project.js`: Implement the resolver logic for `project(id: ID!)` query, interfacing with a `builder-cli` adapter.
*   `src/builder-api/index.js`: Integrate the `project.graphql` schema and `project.js` resolvers into the main Apollo Server (or equivalent) setup.
*   `src/builder-api/utils/builderCliAdapter.js`: Create a utility to abstract calls to the `builder-cli` for project data retrieval (can be a mock initially).

### 4. Verifier/Runtime Checks

1.  **API Service Startup:** Verify that the `builder-api` service starts successfully without errors.
2.  **GraphQL Query Execution:** Execute a GraphQL query against the running API:
    ```graphql
    query GetProject {
      project(id: "test-project-id-123") {
        id
        name
        status
      }
    }
    ```
3.  **Response Validation:** Confirm that the API returns a valid `Project` object (even if mocked data) with expected fields (`id`, `name`, `status`) and no GraphQL errors.
4.  **Log Inspection:** Check `builder-api` service logs for any errors or unexpected warnings during query processing.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Service Failure:** The `builder-api` service fails to start or crashes immediately after startup.
*   **Schema Errors:** The GraphQL query returns a schema validation error (e.g., `Project` type not found, `project` query not found, field not found).
*   **Malformed Response:** The query returns an empty, null, or malformed response when a valid (mocked or existing) project ID is provided.
*   **Authentication Failure:** If basic API access (even without full auth integration) is blocked by unexpected authentication errors.
*   **Integration Failure:** The `builder-cli` adapter fails to retrieve or parse project data, leading to resolver errors.