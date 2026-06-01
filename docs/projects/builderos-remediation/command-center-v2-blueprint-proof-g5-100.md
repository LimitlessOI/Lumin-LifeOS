# Command Center V2 Blueprint Proof - G5-100

## Blueprint Note: Command Registry Core Implementation

This note addresses the initial implementation of the `CommandRegistry` component, a foundational element for the Command Center V2's ability to manage and discover commands.

### 1. Exact Missing Implementation or Proof Gap

The `COMMAND_CENTER_V2_BLUEPRINT.md` defines `CommandRegistry` as a core component responsible for storing command metadata. The current gap is the concrete definition of a `Command` and the initial implementation of the `CommandRegistry` class itself, including methods for registering and retrieving commands. Without this, no commands can be known or routed.

### 2. Smallest Safe Build Slice to Close It

Implement the core `CommandRegistry` with an in-memory store. This slice focuses solely on defining the `Command` interface and providing basic `register` and `getCommand` functionality within the `CommandRegistry` class. This establishes the fundamental mechanism for command discovery.

### 3. Exact Safe-Scope Files to Touch First

-   `src/command-center/interfaces/command.interface.ts`: Define the `Command` interface, specifying essential properties like `name`, `description`, and `handler`.
-   `src/command-center/command-registry.ts`: Implement the `CommandRegistry` class. This class will contain a private `Map` to store `Command` objects, along with public `register(command: Command)` and `getCommand(name: string)` methods.
-   `src/command-center/index.ts`: Export the `CommandRegistry` class for consumption by other Command Center components.

### 4. Verifier/Runtime Checks

1.  **Instantiation Check:** Verify that `CommandRegistry` can be instantiated without errors.
2.  **Registration Check:** Register a dummy command (e.g., `{ name: 'testCommand', description: 'A test command', handler: () => 'executed' }`).
3.  **Retrieval Check (Success):** Retrieve the registered dummy command by its name and assert that the returned object matches the registered command's properties.
4.  **Retrieval Check (Failure):** Attempt to retrieve a command that has not been registered and assert that the method returns `undefined` or `null` (depending on the chosen implementation for non-existent commands).
5.  **Interface Enforcement:** Ensure that attempting to register an object not conforming to the `Command` interface (e.g., missing `name` or `handler`) results in a TypeScript compilation error or a runtime validation error if validation logic is added.

### 5. Stop Conditions If Runtime Truth Disagrees

-   If `CommandRegistry` instantiation fails.
-   If `register` method does not successfully store the command, or if subsequent `getCommand` calls for the registered command return an incorrect or incomplete object.
-   If `getCommand` for a non-existent command throws an unexpected error instead of returning `undefined`/`null`.
-   If the `Command` interface does not effectively guide the structure of command objects, leading to inconsistent command definitions.
-   If the `CommandRegistry` implementation introduces unexpected side effects or dependencies outside its defined scope.