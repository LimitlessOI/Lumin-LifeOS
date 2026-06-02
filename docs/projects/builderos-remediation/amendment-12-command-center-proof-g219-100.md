AMENDMENT 12: COMMAND CENTER - Proof G219-100
Blueprint Note: Next Smallest Build Slice for Command Registry Integration
This note outlines the next atomic build slice to advance the AMENDMENT 12: COMMAND CENTER blueprint, focusing on establishing the foundational `CommandRegistry` and its initial integration with `CommandCenter`.
1.  Exact Missing Implementation or Proof Gap:
    The `CommandCenter` currently lacks the capability to manage and discover available commands. This gap is addressed by implementing the `CommandRegistry` module, which will serve as the central repository for all BuilderOS commands, and integrating it into the `CommandCenter`'s operational lifecycle. Without this, the `CommandCenter` cannot orchestrate commands effectively.
2.  Smallest Safe Build Slice to Close It:
    Implement the core `CommandRegistry` module with methods for registering and retrieving commands. Subsequently, modify the `CommandCenter` to instantiate and utilize the `CommandRegistry` to register its own internal commands and provide an interface for external command registration. This slice focuses solely on the structural integration and basic command management, without implementing command execution logic.
3.  Exact Safe-Scope Files to Touch First:
    *   `src/builderos/command-registry.js` (new file)
    *   `src/builderos/command-center.js` (modification)
    *   `tests/unit/builderos/command-registry.test.js` (new file)
    *   `tests/integration/builderos/command-center.test.js` (new file, focused on registry interaction)
4.  Verifier/Runtime Checks:
    *   **Unit Tests:** `command-registry.test.js` passes, verifying `CommandRegistry` can register and retrieve commands by ID.
    *   **Integration Tests:** `command-center.test.js` passes, verifying `CommandCenter` successfully instantiates `CommandRegistry` and registers at least one dummy command, which can then be retrieved via `CommandCenter`'s interface.
    *   **Runtime Check:** A BuilderOS instance starts, and `CommandCenter` logs (or exposes via a debug endpoint) that its `CommandRegistry` is initialized and contains the expected number of initial commands (e.g., 1 dummy command).
5.  Stop Conditions if Runtime Truth Disagrees:
    *   `CommandRegistry` unit tests fail (e.g., commands cannot be registered or retrieved correctly).
    *   `CommandCenter` integration tests fail (e.g., `CommandCenter` fails to instantiate `CommandRegistry` or cannot register/retrieve commands through it).
    *   During BuilderOS startup, `CommandCenter` logs indicate `CommandRegistry` initialization failure or an incorrect count of registered commands.
    *   Any unexpected side effects on existing BuilderOS command execution (though this slice should not touch execution logic, only registration).