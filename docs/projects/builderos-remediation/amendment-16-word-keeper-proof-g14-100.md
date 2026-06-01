# Amendment 16 Word Keeper Proof - G14-100: Initial Repository Implementation

This document outlines the next smallest build slice for the Word Keeper system, focusing on the foundational persistence layer as defined in `docs/projects/AMENDMENT_16_WORD_KEEPER.md`. The goal is to establish the basic ability to store and retrieve `Word` entities, which is a prerequisite for all subsequent business logic.

---

## Blueprint Note: Proof-Closing Build Slice

**1. Exact Missing Implementation or Proof Gap:**
The core persistence mechanism for `Word` entities, specifically the concrete implementation of the `WordKeeperRepository` interface for basic `saveWord` and `getWord` operations. This gap prevents any stateful operations within the Word Keeper system.

**2. Smallest Safe Build Slice to Close It:**
Implement an in-memory version of the `WordKeeperRepository` that supports the `saveWord` and `getWord` methods. This implementation will define the `Word` interface and `WordState` enum, and provide a basic, non-persistent storage mechanism suitable for initial development and testing of the domain layer.

**3. Exact Safe-Scope Files to Touch First:**
-   `src/core/word-keeper/domain/word.interface.ts` (Define `Word` interface and `WordState` enum)
-   `src/core/word-keeper/domain/word-keeper-repository.interface.ts` (Define `WordKeeperRepository` interface)
-   `src/core/word-keeper/infrastructure/in-memory-word-keeper.repository.ts` (Implement `InMemoryWordKeeperRepository` with `saveWord` and `getWord`)
-   `src/core/word-keeper/infrastructure/in-memory-word-keeper.repository.test.ts` (Unit tests for `InMemoryWordKeeperRepository`)

**4. Verifier/Runtime Checks:**
-   **Test Case 1: Save and Retrieve a Word:**
    -   Create a new `Word` object.
    -   Call `repository.saveWord(word)`.
    -   Call `repository.getWord(word.id)`.
    -   Assert that the retrieved word is not `null`.
    -   Assert that the retrieved word's properties (e.g., `id`, `value`, `state`) exactly match the original saved word's properties.
-   **Test Case 2: Retrieve Non-Existent Word:**
    -   Call `repository.getWord('non-existent-id')`.
    -   Assert that the returned value is `null`.

**5. Stop Conditions if Runtime Truth Disagrees:**
-   If `repository.saveWord()` throws an unexpected error during a successful save operation.
-   If `repository.getWord()` returns `null` for a word that was successfully saved.
-   If `repository.getWord()` returns a `Word` object whose properties do not match the original saved `Word` object.
-   If `repository.getWord()` returns a non-`null` value for an ID that was never saved.