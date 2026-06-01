# Command Center V2 Blueprint Proof: G44-100 - Core Command Definition and Registry

This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, derived from `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`. It outlines the next smallest, safest, and most foundational step to establish the core command definition and registration mechanism.

---

## Blueprint Note: Core Command Definition and Registry

**1. Exact missing implementation or proof gap:**
The foundational definition of what constitutes a "Command" and "CommandResult" within the system, and a mechanism to register and retrieve these command definitions. Without these core structures and a registry, no command can be recognized, processed, or executed by the system. This gap prevents any further development of command processing or UI integration.

**2. Smallest safe build slice to close it:**
Implement the core data models for `Command` and `CommandResult` as TypeScript interfaces, and establish a basic `CommandRegistry` class. This registry will be responsible for holding definitions of available commands, allowing them to be registered and retrieved by a unique identifier. This slice focuses purely on defining the "what" of commands and their discoverability, without involving complex execution logic or UI.

**3. Exact safe-scope files to touch first:**
-   `src/models/Command.ts`: Define the `Command` interface, including properties like `id`, `name`, `description`, `handler` (a function signature), and `args` (interface for command arguments).
-   `src/models/CommandResult.ts`: Define the `CommandResult` interface, including properties like `status`, `message`, and `data`.
-   `src/backend/CommandRegistry.ts`: Implement the `CommandRegistry` class with methods to `registerCommand(command: Command)` and `getCommand(id: string): Command | undefined`.

**4. Verifier/runtime checks:**
-   **Unit Tests for `CommandRegistry`:**
    -   Verify that a `Command` object conforming to the `Command` interface can be successfully registered.
    -   Verify that a registered command can be retrieved by its unique `id`.
    -   Verify that attempting to retrieve a command with an unknown `id` returns `undefined`.
    -   Verify that registering a command with an `id` that already exists either throws an error or updates the existing command (initial implementation should likely throw to prevent accidental overwrites).
-   **Type Checks:** Ensure `Command` and `CommandResult` interfaces are correctly defined and used without TypeScript errors in `CommandRegistry`.
-   **Basic Integration Test (within backend scope):** Instantiate `CommandRegistry`, define a simple dummy `Command` object, register it, and then attempt to retrieve it, asserting its properties match the registered definition.

**5. Stop conditions if runtime truth disagrees:**
-   If `Command` or `CommandResult` interfaces cannot be defined without introducing circular dependencies or fundamental type system conflicts.
-   If `CommandRegistry` fails to reliably store and retrieve command definitions as per its specified interface and expected behavior (e.g., `getCommand` consistently returns incorrect or missing commands after registration).
-   If unit tests for `CommandRegistry` consistently fail, indicating a flaw in the core registration logic or the underlying data structures.
-   If the chosen file structure (`src/models`, `src/backend`) proves incompatible with existing project patterns or build processes, requiring a re-evaluation of file placement.