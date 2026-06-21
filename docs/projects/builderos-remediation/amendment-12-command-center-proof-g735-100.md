<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G735 100. -->

Amendment 12 Command Center Proof - G735-100
Blueprint Note: Next Smallest Build Slice

This note outlines the next smallest, self-contained build slice for the BuilderOS Command Center, focusing on establishing the core command definition and handler registration mechanism.

1. Exact Missing Implementation or Proof Gap
The fundamental gap is the definition of the core `Command` structure and the `CommandRegistry` module, which is responsible for mapping command types to their respective handler functions. Without this foundational piece, the `CommandQueue` cannot enqueue meaningful commands, and the `CommandProcessor` cannot execute them.

2. Smallest Safe Build Slice to Close It
This build slice will establish the foundational `Command` interface/type and implement the `CommandRegistry` module.
The `Command` interface will define the expected structure for all commands, including a `type` property (string) and a `payload` property (object).
The `CommandRegistry` module will provide functions to:
    - `registerCommand(commandType: string, handler: Function)`: Associates a command type with its processing function.
    - `getHandler(commandType: string): Function | undefined`: Retrieves the handler for a given command type.
This slice focuses purely on the definition and registration mechanism, without implementing any specific command handlers or integrating with the `CommandQueue` or `CommandProcessor` beyond basic handler lookup.

3. Exact Safe-Scope Files to Touch First
- `src/builderos/command/types.js`: Define the `Command` interface/type.
- `src/builderos/command/registry.js`: Implement the `CommandRegistry` module.
- `src/builderos/command/registry.test.js`: Add unit tests for `CommandRegistry`.

4. Verifier/Runtime Checks
- **Unit Tests (`src/builderos/command/registry.test.js`)**:
    - Verify `CommandRegistry.registerCommand` successfully stores handlers.
    - Verify `CommandRegistry.getHandler` retrieves the correct handler for registered types.
    - Verify `CommandRegistry.getHandler` returns `undefined` for unregistered types.
    - Verify attempts to register the same command type twice either throw an error or overwrite (prefer error for clarity).
- **Manual Inspection**: Confirm `Command` type definition is clear and `CommandRegistry` functions are exported correctly.

5. Stop Conditions if Runtime Truth Disagrees
- `CommandRegistry` unit tests fail, indicating incorrect registration or retrieval logic.
- `CommandRegistry` module cannot be imported or its functions are not accessible from other BuilderOS modules (e.g., `CommandProcessor` in a later slice).
- The defined `Command` structure is insufficient or causes type conflicts when integrated with other BuilderOS components.