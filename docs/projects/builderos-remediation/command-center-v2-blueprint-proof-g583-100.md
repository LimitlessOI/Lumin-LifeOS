# Blueprint Proof: Command Center V2 - Registry Core (G583-100)

This document outlines the next smallest build slice for the Command Center V2, focusing on the foundational `CommandRegistry` component. This proof closes the gap related to the core mechanism for defining and managing commands.

---

## Blueprint Note: Command Registry Core Implementation

**1. Exact missing implementation or proof gap:**
The fundamental capability to register and retrieve command definitions within the `CommandRegistry` is not yet implemented or proven. This includes the data structure for command definitions and the methods to manage them.

**2. Smallest safe build slice to close it:**
Implement a minimal `CommandRegistry` class. This class will provide methods to `registerCommand(definition)` and `getCommandDefinition(commandId)`. The `definition` will be a simple object containing at least `id`, `name`, and `description`. This slice focuses solely on the registry's internal state management and lookup, without involving command parsing, execution, or complex validation beyond basic existence.

**3. Exact safe-scope files to touch first:**
-   `src/command-center/CommandRegistry.js`: New file for the `CommandRegistry` class.
-   `src/command-center/CommandRegistry.test.js`: New file for unit tests covering `CommandRegistry` functionality.

**4. Verifier/runtime checks:**
-   **Unit Test:** Instantiate `CommandRegistry`.
-   **Unit Test:** Call `registerCommand` with a valid, unique command definition (e.g., `{ id: 'test-cmd', name: 'Test Command', description: 'A test command.' }`).
-   **Unit Test:** Call `getCommandDefinition` with the `id` of the registered command. Assert that the returned definition object is strictly equal to the one registered.
-   **Unit Test:** Call `getCommandDefinition` with an `id` for a command that has not been registered. Assert that the method returns `undefined` or `null` (depending on implementation choice, `undefined` is preferred for non-existence).
-   **Unit Test:** Attempt to register a command with an `id` that already exists. Assert that the registry either throws an error or updates the existing command (error is preferred for initial strictness).

**5. Stop conditions if runtime truth disagrees:**
-   If `CommandRegistry` cannot be instantiated without errors.
-   If `registerCommand` fails to store a command definition, or if subsequent `getCommandDefinition` calls do not retrieve the exact, correct definition.
-   If `getCommandDefinition` returns a definition for a command that was never registered.
-   If `getCommandDefinition` returns an unexpected value (e.g., an empty object, an incorrect type) for a non-existent command instead of `undefined`/`null`.
-   If registering a duplicate command ID does not behave as expected (e.g., silently overwrites when an error is desired, or errors when an overwrite is desired).