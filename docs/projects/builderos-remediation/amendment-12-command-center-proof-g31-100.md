# Amendment 12: Command Center - Proof G31-100

## Blueprint Note: Foundational Types and Command Registration

This proof-closing blueprint note addresses the initial build slice for the `AMENDMENT_12_COMMAND_CENTER` blueprint, focusing on establishing the core types and the mechanism for command registration. This slice, designated G31-100, proves the foundational structure required before command execution logic can be introduced.

---

### 1. Exact Missing Implementation or Proof Gap

The fundamental definitions for the `CommandState` enum, the `Command` interface (or abstract class), and the `CommandCenter` class itself are missing. Specifically, the `CommandCenter` needs to be capable of instantiating and registering command types, which is the first interaction point for BuilderOS. The gap is the existence of these core types and the `CommandCenter.registerCommand` method.

### 2. Smallest Safe Build Slice to Close It

Implement the `CommandState` enum, the `Command` interface, and the `CommandCenter` class with its `constructor` and the `registerCommand` method. This slice focuses purely on type definition and the ability to store references to command constructors, without involving command execution, queuing, or history management.

### 3. Exact Safe-Scope Files to Touch First

-   `src/core/command-center/command-state.ts`: Define the `CommandState` enum.
-   `src/core/command-center/command.ts`: Define the `Command` interface (or abstract class) with `execute`, `rollback`, `status`, and `progress` methods.
-   `src/core/command-center/command-center.ts`: Define the `CommandCenter` class, including its constructor and the `registerCommand(name: string, commandCtor: new () => Command)` method.

### 4. Verifier/Runtime Checks

1.  **Instantiate `CommandCenter`:** Verify that `new CommandCenter()` does not throw an error.
2.  **Define and Implement `TestCommand`:** Create a simple class `TestCommand` that implements the `Command` interface, providing dummy implementations for its methods.
3.  **Register `TestCommand`:** Call `commandCenter.registerCommand('test-command', TestCommand)`. Verify that this call completes without throwing an error.
4.  **Internal Registry Check:** (Requires a temporary, internal-only getter for proof) Verify that the `CommandCenter`'s internal registry (e.g., `this.registeredCommands`) contains an entry for `'test-command'` pointing to `TestCommand`.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `new CommandCenter()` throws an error.
-   If a class implementing the `Command` interface cannot be defined or instantiated.
-   If `commandCenter.registerCommand()` throws an error when provided with a valid command name and constructor.
-   If, after successful registration, the `CommandCenter` does not internally reflect the presence of the registered command type (e.g., if a subsequent internal lookup for `'test-command'` fails).
---MET