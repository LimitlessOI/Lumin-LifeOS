<!-- SYNOPSIS: Documentation — Command Center V2 Blueprint Proof G42 100. -->

Blueprint Proof: Command Center V2 - User Command Integration (g42-100)
This document serves as a proof-closing blueprint note for the integration of `UserCommand` functionality into the Command Center V2, following the initial build slice that established core routing, registry, executor, and basic `SystemCommand` handling.
---
1.  **Exact Missing Implementation or Proof Gap:**
    The current Command Center V2 supports `SystemCommand` registration and execution. The gap is the full integration path for `UserCommand`s, enabling their definition, registration, validation, and execution within the existing command infrastructure. This includes defining the `UserCommand` interface, adapting the command registry to handle both types, and extending the executor to correctly dispatch `UserCommand`s with appropriate context and permissions.

2.  **Smallest Safe Build Slice to Close It:**
    Implement the foundational `UserCommand` interface and a minimal registration/execution flow for a single, simple `UserCommand` (e.g., `EchoUserCommand`). This slice will focus on:
    *   Defining the `IUserCommand` interface.
    *   Creating a dedicated `UserCommandRegistry` or extending the existing `CommandRegistry` to differentiate and manage `UserCommand`s.
    *   Modifying the `CommandExecutor` to resolve and execute `UserCommand`s based on incoming requests, ensuring proper context passing.
    *   Implementing one concrete `EchoUserCommand` for proof of concept.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `src/commands/interfaces/IUserCommand.js` (new file for interface definition)
    *   `src/commands/registry.js` (extend `CommandRegistry` to handle `UserCommand`s)
    *   `src/commands/executor.js` (extend `CommandExecutor` to dispatch `UserCommand`s)
    *   `src/commands/user-commands/EchoUserCommand.js` (new file for sample `UserCommand` implementation)
    *   `src/commands/index.js` (update exports/imports if necessary for new user commands)

4.  **Verifier/Runtime Checks:**
    *   **Unit Test:** `EchoUserCommand` can be instantiated and its `execute` method called directly with expected output.
    *   **Integration Test:** Register `EchoUserCommand` via the `CommandRegistry`. Send a simulated command request to the `CommandExecutor` for `EchoUserCommand` and verify successful execution and output.
    *   **Regression Test:** Verify existing `SystemCommand`s continue to register and execute correctly without interference.
    *   **Type Check:** Ensure all new and modified code passes TypeScript compilation (if applicable).

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   `EchoUserCommand` fails to register or execute correctly through the `CommandExecutor`.
    *   Existing `SystemCommand` functionality is disrupted or exhibits unexpected behavior.
    *   Type errors or runtime exceptions are introduced in core command handling logic.
    *   Performance degradation is observed in command dispatch or execution.