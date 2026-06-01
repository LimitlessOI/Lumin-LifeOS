# Command Center V2 Blueprint Proof: G86-100 - Core Command Definition and Registry

This proof addresses the foundational elements for defining and registering commands within the Command Center V2, aligning with Phase 1 of the blueprint's phased rollout. It focuses on establishing the `ICommand` interface and the `CommandRegistry` component.

---

### Blueprint Note: Next Smallest Build Slice

**1. Exact Missing Implementation or Proof Gap:**
The blueprint specifies a `CommandRegistry` to store available commands. The immediate gap is the concrete definition of what constitutes a "command" (`ICommand` interface) and the initial implementation of the `CommandRegistry` to allow for command registration and retrieval. This forms the bedrock upon which command execution and routing will be built.

**2. Smallest Safe Build Slice to Close It:**
Implement the `ICommand` interface and a basic `CommandRegistry` class. The `CommandRegistry` will provide methods to `register` a command (associating it with a unique ID) and `get` a command by its ID. This slice focuses purely on command definition and lookup, deferring execution logic.

**3. Exact Safe