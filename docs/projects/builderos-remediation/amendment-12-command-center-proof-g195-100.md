# Amendment 12 Command Center Proof: G195-100 - Initial Command Registry & Router Foundation

This proof-closing blueprint note addresses the foundational implementation of the BuilderOS Command Center, focusing on the core `CommandRegistry` and `CommandRouter` components as outlined in `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`.

---

### 1. Exact Missing Implementation or Proof Gap

The blueprint defines the conceptual architecture for the `CommandRegistry` and `CommandRouter` but lacks the concrete initial implementation for these core components and their associated interfaces. The immediate gap is the establishment of the basic data structures and methods required to register commands and route them to their respective handlers. This includes defining the `ICommand` and `ICommandHandler` interfaces and the initial class structures for `CommandRegistry` and `CommandRouter`.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Defining the `ICommand` interface to standardize command payloads.
*   Defining the `ICommandHandler` interface for command processing functions.
*   Implementing a basic `CommandRegistry` class capable of:
    *   Registering a command name with its corresponding `ICommandHandler`.
    *   Retrieving a handler by command name.
*   Implementing a basic `CommandRouter` class capable of:
    *   Receiving a command (e.g., `ICommand` instance).
    *   Using the `CommandRegistry` to find the appropriate handler.
    *   Invoking the handler with the command payload.
This slice focuses purely on the registration and dispatch mechanism, deferring complex lifecycle management, asynchronous execution, or result handling to subsequent passes.

### 3. Exact Safe-Scope Files to Touch First

*   `src/builderos/command-center/interfaces.ts` (New file for `ICommand`, `ICommandHandler`)
*   `src/builderos/command-center/command-registry.ts` (New file for `CommandRegistry` class)
*   `src/builderos/command-center/command-router.ts` (New file for `CommandRouter` class)
*   `src/builderos/command-center/index.ts` (New file for exporting the core components)

### 4. Verifier/Runtime Checks

*   **Registration Check:** Instantiate `CommandRegistry`, register a dummy command handler for a specific command name. Verify that `registry.getHandler('dummyCommand')` returns the registered handler.
*   **Routing Check:** Instantiate `CommandRegistry` and `CommandRouter`. Register a simple handler that logs its input. Create a dummy command. Call `router.route(dummyCommand)`. Verify that the registered handler is invoked and receives the correct command payload.
*   **Unregistered Command Check:** Attempt to route a command that has no registered handler. Verify that the `CommandRouter` handles this gracefully (e.g., throws a specific error, returns a null/undefined result, or logs a warning, depending on the chosen error handling pattern).

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `CommandRegistry` fails to store or retrieve handlers reliably by their command names.
*   If `CommandRouter` cannot successfully locate and invoke a handler for a registered command.
*   If the basic flow of command registration and subsequent routing/dispatch does not function as expected, indicating a fundamental flaw in the core plumbing.
*   If the defined interfaces (`ICommand`, `ICommandHandler`) prove insufficient or overly restrictive for the initial command definition.