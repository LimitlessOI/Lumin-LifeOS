# Command Center V2 Blueprint Proof: g919-100 - Initial Registry & Command Definition

This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, focusing on establishing the foundational command registry and basic command definition.

---

### Blueprint Note: Initial Command Registry & Definition Proof

**1. Exact Missing Implementation or Proof Gap:**
The fundamental proof gap is the ability to define a command interface, implement a concrete command, and successfully register it within a basic command registry structure. This establishes the core data model and registration mechanism without involving execution or I/O.

**2. Smallest Safe Build Slice to Close It:**
This slice focuses on defining the core interfaces for commands and the registry, implementing a minimal registry, and creating a simple, self-referential command (`ListCommandsCommand`) to prove the registration mechanism.

**3. Exact Safe-Scope Files to Touch First:**
-   `src/core/command-center-v2/interfaces/ICommand.ts`: Define the `ICommand` interface.
-   `src/core/command-center-v2/interfaces/ICommandRegistry.ts`: Define the `ICommandRegistry` interface.
-   `src/core/command-center-v2/CommandRegistry.ts`: Implement the `CommandRegistry` class, adhering to `ICommandRegistry`.
-   `src/core/command-center-v2/commands/ListCommandsCommand.ts`: Implement `ListCommandsCommand`, adhering to `ICommand`.
-   `src/core/command-center-v2/CommandRegistry.test.ts`: Write unit tests to verify command registration and retrieval.

**4. Verifier/Runtime Checks:**
-   **Unit Test (`CommandRegistry.test.ts`):**
    -   Verify `CommandRegistry` can be instantiated.
    -   Verify `ListCommandsCommand` can be instantiated.
    -   Verify `registry.register(listCommandsCommand)` successfully adds the command.
    -   Verify `registry.getCommand('list')` (or appropriate alias/name) returns the registered `ListCommandsCommand` instance.
    -   Verify `registry.listCommands()` returns an array containing the registered `ListCommandsCommand`.
    -   Verify attempting to register a command with a duplicate name/alias either fails gracefully or updates as expected (initial implementation can choose one).
    -   Verify `registry.getCommand()` returns `undefined` for an unregistered command.

**5. Stop Conditions if Runtime Truth Disagrees:**
-   If `ICommand` or `ICommandRegistry` cannot be defined without type errors or circular dependencies.
-   If `CommandRegistry` fails to instantiate or its `register` method throws an unexpected error for a valid `ICommand` instance.
-   If `CommandRegistry.getCommand()` or `CommandRegistry.listCommands()` do not accurately reflect registered commands after successful registration.
-   If the `ListCommandsCommand` cannot be defined or instantiated without errors.
-   If the unit tests in `CommandRegistry.test.ts` fail to pass, indicating a fundamental flaw in the registration or retrieval logic.

---

This proof confirms the foundational elements for Command Center V2 can be established, providing a stable base for subsequent build slices focused on command execution, input parsing, and output rendering.