<!-- SYNOPSIS: Command Center V2 Blueprint Proof: G367-100 - CommandRegistry Core -->

# Command Center V2 Blueprint Proof: G367-100 - CommandRegistry Core

This document outlines the next smallest blueprint-backed build slice for the Command Center V2, focusing on the foundational `CommandRegistry`.

---

### Blueprint Note: CommandRegistry Core Implementation

1.  **Exact missing implementation or proof gap:**
    The core `CommandRegistry` module, responsible for storing and retrieving command definitions, is not yet implemented. This is the foundational piece required before any command input, execution, or history can function. Specifically, the ability to register a command by name and retrieve it is missing.

2.  **Smallest safe build slice to close it:**
    Implement the `CommandRegistry` module as a class or a singleton that manages a map of command names to command objects. It should expose at least two methods: `registerCommand(name, commandObject)` and `getCommand(name)`. The initial `commandObject` can be a simple placeholder or an object with a basic `execute` method signature.

3.  **Exact safe-scope files to