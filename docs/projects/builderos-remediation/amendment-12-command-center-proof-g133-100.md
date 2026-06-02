# Amendment 12 Command Center Proof: G133-100 - Initial Command Definition and Registry

This document serves as a proof-closing blueprint note for the initial build slice of the Amendment 12 Command Center. It addresses the foundational elements required to define and manage commands within the BuilderOS context.

---

## Proof-Closing Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The core definition of a `Command` interface/type and a `CommandRegistry` service is missing. This gap prevents the systematic registration and retrieval of executable commands within the BuilderOS Command Center.

**2. Smallest Safe Build Slice to Close It:**
Implement the `ICommand` interface (or type alias) defining the structure of a command, and a `CommandRegistry` class responsible for registering and retrieving `ICommand` instances by a unique identifier. This slice establishes the fundamental data model and a central management point for commands.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/builder-os/commands/ICommand.ts`: Defines the `ICommand` interface, specifying properties like `id`, `name`, `description`, and an `execute` method signature.
*   `src/builder-os/commands/CommandRegistry.ts`: Implements the `CommandRegistry` class with `register(command: ICommand)` and `getCommand(id: string)` methods.
*   `src/builder-os/commands/index.ts`: Exports `ICommand` and `CommandRegistry` for external consumption within BuilderOS.
*   `src/builder-os/commands/__tests__/CommandRegistry.test.ts`: Unit tests for the `CommandRegistry` class.

**4. Verifier/Runtime Checks:**
*   **Unit Tests:**
    *   `CommandRegistry.test.ts` verifies that `register` successfully adds commands to the registry.
    *   `CommandRegistry.test.ts` verifies that `getCommand` retrieves the correct command by its ID.
    *   `CommandRegistry.test.ts` verifies that `getCommand` returns `undefined` or `null` for unregistered command IDs.
    *   `CommandRegistry.test.ts` verifies that registering a command with an existing ID either throws an error or overwrites (depending on chosen behavior, but consistency is key).
*   **Type Checks:** Ensure `ICommand` is correctly typed and enforced across any mock command implementations.
*   **Integration Check (Manual/Dev):** Instantiate `CommandRegistry` in a development environment and attempt to register and retrieve a simple mock command without runtime errors.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   `CommandRegistry` fails to correctly register or retrieve commands as specified by its unit tests.
*   Type conflicts or errors arise when defining `ICommand` or when attempting to implement a mock command conforming to `ICommand`.
*   The `CommandRegistry` cannot be imported or instantiated within existing BuilderOS service contexts without introducing new, unexpected dependencies or breaking changes.
*   Performance degradation is observed during command registration or retrieval for a reasonable number of commands (e.g., 100+).