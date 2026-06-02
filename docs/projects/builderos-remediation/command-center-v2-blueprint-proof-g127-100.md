# Command Center V2 Blueprint Proof - G127-100

## Blueprint Note: CommandRegistry Foundation

This note closes the proof gap for the foundational `CommandRegistry` component, deriving the next smallest build slice required for Command Center V2.

---

### 1. Exact Missing Implementation or Proof Gap

The core `CommandRegistry` component, responsible for storing and managing command metadata and their associated handlers, is not yet implemented or proven. This prevents any command from being discoverable or routable within the Command Center V2 system, making it the critical first step for establishing the command plane.

### 2. Smallest Safe Build Slice to Close It

Implement the `CommandRegistry` module. This slice will focus solely on establishing the registry's internal state and its primary interface for command management. It will:
*   Define the `CommandRegistry` class/object.
*   Provide a `registerCommand(commandName, handler)` method to add commands.
*   Provide a `getCommand(commandName)` method to retrieve registered command handlers.
*   Ensure the registry can handle basic command metadata (e.g., just the handler for now).
*   This slice explicitly *does not* involve integration with `CommandRouter`, `CommandExecutor`, or any external API surfaces.

### 3. Exact Safe-Scope Files to Touch First

*   `src/command-center/CommandRegistry.js`: Core implementation of the `CommandRegistry` class/module.
*   `src/command-center/index.js`: Export the `CommandRegistry` instance or class for consumption within the `command-center` domain.
*   `test/command-center/CommandRegistry.test.js`: Unit tests for the `CommandRegistry`'s registration and retrieval logic.

### 4. Verifier/Runtime Checks

*   **Unit Tests (`test/command-center/CommandRegistry.test.js`):**
    *   Verify `registerCommand` successfully adds a command and its handler to the registry.
    *   Verify `getCommand` accurately retrieves the handler for a registered command.
    *   Verify `getCommand` returns `undefined` or `null` for a command that has not been registered.
    *   Verify behavior when attempting to register a command with a name that already exists (e.g., throws an error or overwrites, based on established patterns).
    *   Verify the registry can store multiple distinct commands.
*   **Manual Dev Integration (Temporary):**
    *   In a local development script, import the `CommandRegistry` and attempt to register a dummy command.
    *   Immediately attempt to retrieve the dummy command.
    *   Confirm no runtime errors and that the retrieved handler matches the registered one.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If any unit tests for `CommandRegistry` fail or exhibit unexpected behavior.
*   If `CommandRegistry` cannot be imported or initialized correctly within the `src/command-center` module scope.
*   If `registerCommand` or `getCommand` methods introduce unexpected side effects, memory leaks, or significant performance degradation during local testing.
*   If the implementation requires or introduces new, unapproved external dependencies not specified in the blueprint.
*   If the `CommandRegistry` fails to maintain a consistent internal state across multiple registration and retrieval operations