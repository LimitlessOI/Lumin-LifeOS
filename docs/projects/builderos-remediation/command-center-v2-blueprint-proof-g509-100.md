Command Center V2 Blueprint Proof: G509-100 - Command Registry Core
This document serves as a proof-closing blueprint note for the `CommandRegistry` core component, derived from the `COMMAND_CENTER_V2_BLUEPRINT.md`. It outlines the next smallest build slice required to advance the Command Center V2 implementation, focusing on establishing a functional command registration mechanism.
---
1. Exact Missing Implementation or Proof Gap
The current state lacks a concrete, functional `CommandRegistry` module capable of storing and retrieving command definitions. While the blueprint defines the concept, the foundational code for registering and accessing commands is not yet implemented, which is a prerequisite for command parsing and execution.
2. Smallest Safe Build Slice to Close It
Implement the `CommandRegistry` module. This slice will provide the core functionality for adding new command definitions and retrieving them by their unique identifier. It will establish the data structure for command storage and the public API for interaction.
Key functionalities:
-   `registerCommand(commandName: string, commandDefinition: CommandDefinition)`: Adds a command to the registry.
-   `getCommand(commandName: string): CommandDefinition | undefined`: Retrieves a command from the registry.
3. Exact Safe-Scope Files to Touch First
-   `src/command-center/command-types.js`: Define the `CommandDefinition` interface/schema. (If not already present, otherwise extend existing).
-   `src/command-center/command-registry.js`: Implement the `CommandRegistry` module.
-   `src/command-center/index.js`: Export the `CommandRegistry` instance or its functions. (If `src/command-center` is the module entry point).
4. Verifier/Runtime Checks
To confirm the successful implementation and functionality of the `CommandRegistry`:
1.  **Basic Registration & Retrieval**:
    *   Register a simple command, e.g., `registerCommand('testCommand', { description: 'A test command' })`.
    *   Retrieve `testCommand` and assert that the returned `CommandDefinition` matches the registered one.
    *   Attempt to retrieve a non-existent command, e.g., `getCommand('nonExistent')`, and assert that it returns `undefined`.
2.  **Module Export Verification**:
    *   Ensure `CommandRegistry` (or its public API functions) is correctly exported from `src/command-center/index.js` and importable by other modules.
5. Stop Conditions if Runtime Truth Disagrees
The build slice should be halted and re-evaluated if any of the following conditions are met during runtime verification:
*   **Registration Failure**: `registerCommand` throws an unexpected error or fails to store the command definition.
*   **Retrieval Inaccuracy**: `getCommand` returns an incorrect `CommandDefinition` for a registered command, or returns a definition for a non-existent command.
*   **Module Unavailability**: The `CommandRegistry` module or its public functions cannot be imported or accessed as expected from `src/command-center/index.js`.
*   **Type Mismatch**: The `CommandDefinition` structure, as defined in `command-types.js`, is not correctly enforced or handled by `command-registry.js`.