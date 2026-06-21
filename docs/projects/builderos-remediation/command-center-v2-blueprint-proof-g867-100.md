<!-- SYNOPSIS: Command Center V2 Blueprint Proof: g867-100 - Initial Metrics API Slice -->

# Command Center V2 Blueprint Proof: g867-100 - Initial Metrics API Slice

This document serves as a proof-closing blueprint note for the initial build slice of the Command Center V2, focusing on establishing the foundational API for core LifeOS metrics as outlined in Phase 1 of the `COMMAND_CENTER_V2_BLUEPRINT.md`.

---

### Blueprint Note: Initial Metrics API Slice

**1. Exact missing implementation or proof gap:**
The `COMMAND_CENTER_V2_BLUEPRINT.md` specifies "Display core LifeOS metrics (e.g., task completion, health data, financial summaries)" as part of Phase 1. The current gap is the absence of a defined GraphQL schema and resolver for *any* core metric, preventing the frontend from querying even placeholder data.

**2. Smallest safe build slice to close it:**
Define a basic `Metric` GraphQL type and a `taskCompletionRate` query that returns a placeholder numerical value. This establishes the API contract and allows for frontend development against a known endpoint without requiring immediate backend data integration.

**3. Exact safe-scope files to touch first:**
*   `src/api/graphql/schema.js`: Extend the existing GraphQL schema to include a `Metric` type and a `taskCompletionRate` query.
*   `src/api/graphql/resolvers/metricResolver.js`: Create a new resolver file (or extend an existing one if a `metrics` domain resolver already exists) to provide a placeholder implementation for `taskCompletionRate`.
*   `src/api/graphql/index.js` (or similar entry point): Ensure the new schema and resolvers are correctly integrated into the overall GraphQL server setup.

**4. Verifier/runtime checks:**
*   **GraphQL Query:** Execute the following GraphQL query against the running LifeOS backend:
    ```graphql
    query GetTaskCompletionRate {
      taskCompletionRate
    }
    ```
*   **Expected Output:** The query should return a JSON response similar to:
    ```json
    {
      "data": {
        "taskCompletionRate": 0.85
      }
    }
    ```
    (The specific placeholder number may vary, but it must be a valid number.)
*   **Server Logs:** Verify that the Node.js server starts without GraphQL schema or resolver errors.

**5. Stop conditions if runtime truth disagrees:**
*   The GraphQL query fails with an error (e.g., "Cannot query field 'taskCompletionRate' on type 'Query'").
*   The server fails to start due to schema definition errors or resolver binding issues.
*   The `taskCompletionRate` field returns `null`, an unexpected type (e.g., string, object), or an error instead of a number.
*   The returned value is not a number, indicating a type mismatch in the schema or resolver.

---