### Proof-Closing Blueprint Note: `g48-100` - Initial CommandCenter and Command Registration

This note closes the proof for the foundational existence and basic registration capability of the `CommandCenter` and `Command` classes, as outlined in `AMENDMENT_12_COMMAND_CENTER.md`.

**1. Exact missing implementation or proof gap:**
The core implementation of the `Command` class and the `CommandCenter` class, specifically proving the ability to instantiate `CommandCenter` and successfully register a `Command` object. This establishes the basic structural integrity required for all subsequent command management features.

**2. Smallest safe build slice to close it:**
Implement the `Command` class with a basic constructor and an `id` property. Implement the `CommandCenter` class with a constructor to initialize an internal command registry (e.g., a `Map` or `Object`) and a `registerCommand` method that stores `Command` instances by their ID.

**3. Exact safe-scope files to touch first:**
-   `src/core/command.js`: Define the `Command` class.
-   `src/core/command-center.js`: Define the `CommandCenter` class with `constructor` and `registerCommand`.
-   `src/core/command-center.test.js`: Add unit tests for `CommandCenter` instantiation and `registerCommand` functionality.

**4. Verifier/runtime checks:**
-   **Unit Test (`src/core