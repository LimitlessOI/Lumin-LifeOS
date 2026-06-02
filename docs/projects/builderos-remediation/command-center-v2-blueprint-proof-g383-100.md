# Blueprint Proof: Command Center V2 - Core Command API & Persistence (g383-100)

This document serves as a proof-closing blueprint note for the `g383-100` build slice, focusing on establishing the foundational API and persistence for the `Command` entity within the `@lifeos/command-center-v2-api` service.

---

## Proof-Closing Blueprint Note

**1. Exact missing implementation or proof gap:**
The current gap is the full-stack implementation and proof of concept for creating and retrieving a `Command` entity through the `@lifeos/command-center-v2-api`, ensuring data persistence. This validates the core `Command` data model, its repository interactions, and the exposure of these operations via the API layer (gRPC/REST).

**2. Smallest safe build slice to close it:**
Implement the `createCommand` and `getCommandById` methods within the `CommandRepository` and expose these operations via dedicated gRPC/REST endpoints in the `CommandService`. This slice focuses on a single entity's fundamental CRUD (Create, Read) operations to prove the end-to-end flow from API request to database persistence and retrieval.

**3. Exact safe-scope files to touch first:**
-   `@lifeos/command-center-v2-api/src/data/models/command.ts`: Ensure the `Command` interface/schema is complete and correctly defined for persistence.
-   `@lifeos/command-center-v2-api/src/data/repositories/commandRepository.ts`: Implement `create` and `findById` methods, including any necessary ORM/database interactions.
-   `@lifeos/command-center-v2-api/src/api/v2/command.ts`: Add gRPC/REST endpoint handlers for `CreateCommand` and `GetCommand` operations, utilizing the `CommandRepository`.
-   `@lifeos/command-center-v2-api/src/api/v2/interfaces.ts`: Define request and response DTOs/interfaces for `CreateCommand` and `GetCommand` operations.
-   `@lifeos/command-center-v2-api/src/proto/command_center_v2.proto`: Add gRPC service definitions for `CreateCommand` and `GetCommand` messages and RPC methods.

**4. Verifier/runtime checks:**
-   Successfully start the `@lifeos/command-center-v2-api` service without errors.
-   Using a gRPC client (e.g., `grpc-cli` or a programmatic client), invoke the `CreateCommand` RPC with a valid `Command` payload.
-   Verify that the `CreateCommand` response indicates success and returns the unique identifier (ID) of the newly created command.
-   Immediately after creation, invoke the `GetCommand` RPC using the ID obtained from the `CreateCommand` response.
-