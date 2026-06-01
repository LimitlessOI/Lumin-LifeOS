# Amendment 12: Command Center - Proof G10-100: Core Command Dispatch

This document outlines the first proof-of-concept build slice for Amendment 12, focusing on establishing the foundational mechanism for command registration and synchronous dispatch within the BuilderOS Command Center.

---

### Proof-Closing Blueprint Note

**1. Exact missing implementation or proof gap:**
The core mechanism for defining, registering, and synchronously dispatching BuilderOS commands is missing. This includes the initial structure for a `CommandRegistry` to store command metadata and a basic `CommandDispatcher` capable of retrieving a handler from the registry and executing it.

**2. Smallest safe build slice to close it:**
Implement a minimal `CommandRegistry` to manage command definitions (mapping command names to their respective handler functions or modules) and a `CommandDispatcher` that can synchronously retrieve a handler from the registry and invoke it. This slice will demonstrate the ability to define a simple command and execute it through the dispatch mechanism.

**3. Exact safe-scope files to touch first:**
-   `src/builderos/command-center/CommandRegistry.js`: New file. Implements a singleton or static class to register and retrieve command handlers.
-   `src/builderos/command-center/CommandDispatcher.js`: New file. Implements a class with a `dispatch` method that uses `CommandRegistry` to find and execute handlers.
-   `src/builderos/command-center/commands/TestCommand.js`: New file. A simple, initial command definition (e.g., an object with a `name` and an `execute` method) for proof-of-concept.
-   `src/builderos/command-center/index.js`: New file. Exports the `CommandRegistry` and `CommandDispatcher` instances, and potentially registers initial commands.

**4. Verifier/runtime checks:**
-   **Test Case 1: Successful Command Dispatch**
    -   Register `TestCommand` with `CommandRegistry`.
    -   Call `CommandDispatcher.dispatch('TestCommand', { payload: 'test' })`.
    -   Verify that `TestCommand.execute` is invoked with the correct payload and returns an expected success value or logs a specific message.
-   **Test Case 2: Unregistered Command Handling**
    -   Call `CommandDispatcher.dispatch('NonExistentCommand')`.
    -   Verify that `CommandDispatcher` throws a specific error (e.g., `CommandNotFoundError`) indicating the command is not registered.
-   **Test Case 3: Registry Integrity**
    -   Verify that `CommandRegistry.getCommand('TestCommand')` returns the correct `TestCommand` definition.

**5. Stop conditions if runtime truth disagrees:**
-   If `CommandRegistry` fails to correctly store or retrieve command definitions.
-   If `CommandDispatcher` fails to locate a registered command's handler via the `CommandRegistry`.
-   If `CommandDispatcher` executes an incorrect handler for a given command name.
-   If `CommandDispatcher` does not throw an expected error when attempting to dispatch an unregistered command.
-   If the executed command handler does not produce the expected side effect or return value as defined in its `execute` method.