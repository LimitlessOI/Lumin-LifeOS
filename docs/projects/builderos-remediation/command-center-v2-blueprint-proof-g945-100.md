# Blueprint Proof: Command Center V2 - Core Routing Mechanism (G945-100)

This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, focusing on establishing the core command routing mechanism as outlined in `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`.

---

## Blueprint Note: Core Routing Mechanism Proof

**1. Exact Missing Implementation or Proof Gap:**
The blueprint defines `CommandRouter`, `CommandRegistry`, and `CommandHandlers` as core components for Phase 1. The current gap is the concrete implementation and integration of these components to demonstrate a functional command dispatch flow, specifically proving that a command can be registered and then successfully routed and executed via an internal API endpoint.

**2. Smallest Safe Build Slice to Close It:**
Implement the foundational `CommandRegistry` and `CommandRouter` classes, along with a single, minimal `ping` command handler. This setup will be exposed via a basic internal HTTP API endpoint that accepts a command name and payload, then dispatches it through the `CommandRouter`. This slice proves the core command registration, lookup, and execution flow.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/command-center/interfaces/command.ts`: Define core interfaces for `ICommand`, `ICommandHandler`, and `ICommandResult`.
*   `src/command-center/commandRegistry.ts`: Implement the `CommandRegistry` class responsible for storing command metadata and handlers.
*   `src/command-center/commandRouter.ts`: Implement the `CommandRouter` class responsible for looking up commands in the `CommandRegistry` and executing their handlers.
*   `src/command-center/handlers/pingHandler.ts`: Implement a concrete `ICommandHandler` for a simple `ping` command.
*   `src/command-center/api/internalCommandApi.ts`: Create a module exposing an internal HTTP endpoint (e.g., an Express route handler) that receives command requests and uses `CommandRouter` to process them.
*   `src/command-center/index.ts`: The main entry point for the Command Center module, responsible for initializing `CommandRegistry`, registering `pingHandler`, and setting up the `internalCommandApi` routes.

**4. Verifier/Runtime Checks:**
*   **Test Case 1: Successful `ping` command execution.**
    *   **Action:** Send an HTTP POST request to the internal `/command-center/execute` endpoint with a payload `{ command: "ping", payload: { message: "hello" } }`.
    *   **Expected Outcome:** HTTP 200 OK response with a body similar to `{ status: "success", result: { response: "pong", receivedMessage: "hello" } }`.
*   **Test Case 2: Unregistered command handling.**
    *   **Action:** Send an HTTP POST request to the internal `/command-center/execute` endpoint with a payload `{ command: "unknownCommand", payload: {} }`.
    *   **Expected Outcome:** HTTP 404 Not Found or HTTP 400 Bad Request response with an error message indicating the command is not registered.
*   **Test Case 3: Invalid payload handling.**
    *   **Action:** Send an HTTP POST request to the internal `/command-center/execute` endpoint with an malformed or missing `command` field.
    *   **Expected Outcome:** HTTP 400 Bad Request response with an error message indicating invalid input.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If the `CommandRouter` fails to correctly identify and invoke the `pingHandler` registered in `CommandRegistry` when the `ping` command is requested.
*   If the internal `/command-center/execute` API endpoint cannot be reached, or does not correctly parse incoming command requests and dispatch them via the `CommandRouter`.
*   If the system allows execution of an unregistered command without returning an appropriate error.
*   If the `pingHandler` itself throws an unhandled exception during execution