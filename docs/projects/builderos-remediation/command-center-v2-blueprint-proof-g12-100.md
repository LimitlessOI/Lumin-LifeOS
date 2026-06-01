Blueprint Proof: G12-101 - Command Registry (Initial In-Memory Implementation)
This proof addresses the next concrete build slice for Phase 1 of the Command Center V2 blueprint, focusing on establishing the foundational `CommandRegistry` to manage `CommandDefinition` instances.

1.  **Exact Missing Implementation or Proof Gap:**
    The blueprint requires a mechanism to register and retrieve `CommandDefinition` instances. The gap is the definition of the `ICommandRegistry` interface and a basic in-memory implementation (`InMemoryCommandRegistry`) to prove the concept of command registration and retrieval.

2.  **Smallest Safe Build Slice to Close It:**
    Define the `ICommandRegistry` interface with methods like `registerCommand(command: CommandDefinition): void` and `getCommand(name: string): CommandDefinition | undefined`. Implement a concrete `InMemoryCommandRegistry` class that adheres to this interface, using a `Map<string, CommandDefinition>` to store `CommandDefinition` objects, keyed by their `name`.

3.  **Exact Safe-Scope Files to Touch First:**
    - `src/command-center/v2/command-registry.interface.ts` (new file)
    - `src/command-center/v2/in-memory-command-registry.ts` (new file)
    - `src/command-center/v2/command.types.ts` (to import `CommandDefinition` into the registry files)
    - `src/command-center/v2/in-memory-command-registry.test.ts` (new file for unit tests)

4.  **Verifier/Runtime Checks:**
    - **Static Check:** Successful TypeScript compilation of `command-registry.interface.ts`, `in-memory-command-registry.ts`, and `in-memory-command-registry.test.ts`. This ensures type safety and adherence to TS rules.
    - **Unit Test:** Execute `in-memory-command-registry.test.ts` to confirm:
        - A `CommandDefinition` can be successfully registered.
        - A registered `CommandDefinition` can be retrieved by its `name`.
        - Attempting to retrieve a non-existent command returns `undefined`.
        - Registering a command with an existing name either updates the existing command or throws an error (initial implementation should define and adhere to one behavior).

5.  **Stop Conditions if Runtime Truth Disagrees:**
    - If TypeScript compilation fails for any of the new files, indicating syntax errors or type mismatches.
    - If unit tests in `in-memory-command-registry.test.ts` fail, indicating a functional issue with the registration or retrieval logic.
    - If the `ICommandRegistry` interface or `InMemoryCommandRegistry` implementation is found to be fundamentally incompatible with the `CommandDefinition` schema or the broader Command Center V2 architecture as implied by the blueprint (e.g., inability to handle future persistence requirements).
    - If the chosen file paths conflict with established project conventions or existing files not visible in the current context, requiring re-evaluation of file placement.