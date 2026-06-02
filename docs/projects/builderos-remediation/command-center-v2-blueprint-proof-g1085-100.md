Command Center V2 Blueprint Proof: G1085-100 - Core Command Entity & Persistence

This document serves as a proof-closing note for the initial build slice of Command Center V2, derived from the overarching blueprint. It addresses the foundational requirement for managing commands within the BuilderOS context.

1.  **Exact Missing Implementation or Proof Gap**
    The `Command` entity, while conceptually defined, lacks a concrete, persistent storage mechanism within BuilderOS. The current gap is the absence of an operational persistence layer to store and retrieve `Command` definitions reliably across system restarts.

2.  **Smallest Safe Build Slice to Close It**
    Implement a `CommandRepository` interface and a file-based concrete implementation (`CommandFileRepository`) that supports basic `save` and `findById` operations for `Command` entities. This slice will focus solely on the persistence aspect, ensuring commands can be written to and read from a designated BuilderOS data directory.

3.  **Exact Safe-Scope Files to Touch First**
    *   `src/builder-os/command/domain/command.entity.ts`: Define the `Command` interface/class structure.
    *   `src/builder-os/command/domain/command.repository.ts`: Define the `ICommandRepository` interface.
    *   `src/builder-os/command/infrastructure/command-file.repository.ts`: Implement `ICommandRepository` using file system operations (e.g., JSON files per command ID).
    *   `src/builder-os/command/infrastructure/command-file.repository.spec.ts`: Unit tests for `CommandFileRepository`.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** `CommandFileRepository` unit tests pass for `save` (creates file) and `findById` (reads file) scenarios, including edge cases like non-existent IDs.
    *   **Integration Test (BuilderOS Internal):** A dedicated BuilderOS internal test script or utility function successfully saves a new `Command` entity and subsequently retrieves it, verifying data integrity and persistence across a simulated restart (e.g., by clearing in-memory caches and re-initializing the repository).
    *   **File System Check:** Manually verify the creation and content of command files in the designated BuilderOS data directory (`data/builder-os/commands/`).

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   `Command` entities are not correctly persisted to the file system (files not created, content incorrect).
    *   Retrieval of `Command` entities fails or returns corrupted data.
    *   File system access errors (e.g., permissions issues, path resolution failures) prevent repository operations.
    *   Significant performance degradation observed for `save` or `findById` operations, indicating an inefficient persistence strategy.
    *   The `Command` entity structure defined in `command.entity.ts` proves insufficient or contradictory to the persistence mechanism.