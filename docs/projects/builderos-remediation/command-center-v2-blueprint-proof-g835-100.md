# Command Center V2 Blueprint Proof: G835-100 - Expose Core Read-Only Queries

This document serves as a proof-closing blueprint note for the initial API exposure of core data models, derived from the Command Center V2 Blueprint's Phase 1.

---

### Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The current gap is the exposure of read-only GraphQL queries for the core entities (`Command`, `ExecutionLog`, `Agent`) via the `@lifeos/command-center-api`. While the underlying data models and basic persistence are assumed to be in place (or are the immediate preceding slice), the API layer to retrieve this data is not yet implemented.

**2. Smallest Safe Build Slice to Close It:**
Implement the GraphQL schema definitions and corresponding resolver functions within `@lifeos/command-center-api` to enable read-only queries for `commands`, `executionLogs`, and `agents`. This slice focuses solely on fetching existing data, without any mutation capabilities.

**3. Exact Safe-Scope Files to Touch First:**
*   `packages/command-center-api/src/schema.graphql`: Define the `Query` type and add fields for `commands`, `executionLogs`, and `agents`, specifying their return types (e.g., `[Command!]!`).
*   `packages/command-center-api/src/resolvers/Query.ts`: Implement the resolver functions for `commands`, `executionLogs`, and `agents`. These resolvers will delegate to the appropriate service methods in `@lifeos/command-center-core` to fetch data from the database.
*   `packages/command-center-core/src/services/commandService.ts`: Add a `getCommands()` method (or similar) to retrieve all commands.
*   `packages/command-center-core/src/services/executionLogService.ts`: Add a `getExecutionLogs()` method (or similar) to retrieve all execution logs.
*   `packages/command-center-core/src/services/agentService.ts`: Add a `getAgents()` method (or similar) to retrieve all agents.
*   `packages/command-center-core/src/types.ts`: Ensure core entity types (`Command`, `ExecutionLog`, `Agent`) are correctly defined and exported for use by the API layer.

**4. Verifier/Runtime Checks:**
*   **GraphQL Playground/Client Test:**
    *   Execute `query { commands { id name status } }` and verify a successful response with an array of `Command` objects (even if empty).
    *   Execute `query { executionLogs { id commandId status timestamp } }` and verify a successful response with an array of `ExecutionLog` objects.
    *   Execute `query { agents { id name type }