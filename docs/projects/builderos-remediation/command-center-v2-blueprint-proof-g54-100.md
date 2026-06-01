# Blueprint Proof: Command Center V2 - Command Registry Foundation (G54-100)

**Source Blueprint:** `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`

This proof-closing blueprint note addresses the foundational implementation of the `CommandRegistry` as the next smallest build slice, enabling the core "Command Registration" and "Command Execution" features outlined in the blueprint.

---

### 1. Exact Missing Implementation or Proof Gap

The current gap is the absence of a functional `CommandRegistry` module capable of registering and retrieving command definitions. Specifically, the system lacks the core mechanism to define, store, and access commands like `echo` or `help` before they can be executed. This is a prerequisite for any command input/output integration.

### 2. Smallest Safe Build Slice to Close It

Implement the `CommandRegistry` module and register a single, basic `echo` command. This slice focuses solely on the internal mechanics of command management, independent of UI or execution flow.

**Slice Scope:**
*   Define a `CommandRegistry` class or singleton responsible for `register` and `getCommand` operations.
*   Create a minimal `echo` command definition, including its `name`, `description`, and an `execute` function that simply returns its arguments.
*   Initialize the `CommandRegistry` with the `echo` command upon module load.

### 3. Exact Safe-Scope Files to Touch First

*   `src/core/command-center/CommandRegistry.js` (New file): Contains the `CommandRegistry` class/singleton.
*   `src/core/command-center/commands/echo.js` (New file): Defines the `echo` command object.
*   `src/core/command-center/index.js` (New or existing, to be modified): Exports the `CommandRegistry` instance and ensures initial command registration.
*   `src/core/command-center/CommandRegistry.test.js` (New file): Unit tests for `CommandRegistry`.

### 4. Verifier/Runtime Checks

To verify this slice, the following checks should pass:

*   **Unit Test:** `CommandRegistry.test.js`
    *   `CommandRegistry` can be imported successfully.
    *   `CommandRegistry.getCommand('echo')` returns a non-null object.
    *   The object returned by `getCommand('echo')` has a `name` property equal to `'echo'`.
    *   The object returned by `getCommand('echo')` has an `execute` method that is a function.
    *   Calling `CommandRegistry.getCommand('nonexistent')` returns `undefined`.
    *   Calling `CommandRegistry.getCommand('echo').execute('test argument')` returns `'test argument'`.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass should halt if any of the following conditions are met during verification:

*   `CommandRegistry` module fails to load or throws an initialization error.
*   `CommandRegistry.getCommand('echo')` returns `undefined` or an object that does not conform to the expected command interface (missing `name`, `description`, or `execute` method).
*   The `echo` command's `execute` method does not correctly process and return its input arguments.
*   Any unit tests for `CommandRegistry` fail.
*   Attempting to register a command with an existing name throws an unexpected error (or fails to update as per design).