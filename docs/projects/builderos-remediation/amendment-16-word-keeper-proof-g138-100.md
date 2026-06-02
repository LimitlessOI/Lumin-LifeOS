# Amendment 16: Word Keeper - Proof G138-100

## Blueprint Note: Initial WordKeeper Core Implementation

This note closes the proof gap for the foundational implementation of the `WordKeeper` service, as outlined in `docs/projects/AMENDMENT_16_WORD_KEEPER.md`. It defines the next smallest build slice to establish the core functionality and persistence mechanism.

### 1. Exact Missing Implementation or Proof Gap

The blueprint `AMENDMENT_16_WORD_KEEPER.md` specifies the conceptual design and API for the `WordKeeper` service, including its methods (`addWord`, `removeWord`, `hasWord`, `getWords`, `isValidWord`) and reliance on `kv-store` for persistence. The exact missing implementation is the concrete Node.js/ESM class definition for `WordKeeper` that integrates with the `kv-store` and provides the specified methods, along with initial unit tests to verify its behavior.

### 2. Smallest Safe Build Slice to Close It

Implement the `WordKeeper` class, including its constructor, and the core methods: `addWord`, `removeWord`, `hasWord`, `getWords`, and `isValidWord`. This implementation must leverage the existing `kv-store` for word persistence. The `isValidWord` method should include basic validation logic (e.g., minimum length, character set). This slice focuses solely on the internal logic and persistence of the `WordKeeper` service, without exposing it via any external API or modifying user-facing features.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/word-keeper/index.js`: Create this file to house the `WordKeeper` class definition and its methods.
*   `src/services/word-keeper/word-keeper.test.js`: Create this file for unit tests covering all `WordKeeper` methods and persistence.
*   `src/services/kv-store/index.js`: (Verify existence and import path; no modification expected, but its API will be consumed).

### 4. Verifier/Runtime Checks

*   **Unit Tests (`src/services/word-keeper/word-keeper.test.js`):**
    *   `addWord(word)`: Verify that adding a new valid word succeeds and `hasWord(word)` returns true. Verify adding a duplicate word does not change the word list.
    *   `removeWord(word)`: Verify that removing an existing word succeeds and `hasWord(word)` returns false. Verify removing a non-existent word has no effect.
    *   `hasWord(word)`: Verify correct boolean return for existing and non-existing words.
    *   `getWords()`: Verify it returns an array containing all currently stored words, and only unique words.
    *   `isValidWord(word)`: Verify it correctly identifies valid words (e.g., alphanumeric, min length 2) and invalid words (e.g., empty string, contains special characters, too short).
    *   **Persistence Check:** After adding/removing words, re-initialize the `WordKeeper` instance and verify that the word list (`getWords()`) reflects the changes made by the previous instance, confirming `kv-store` integration.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **`kv-store` Integration Failure:** If `kv-store` cannot be imported, initialized, or its `get`/`set` operations fail or do not persist data as expected.
*   **Core Method Inconsistencies:** If `addWord`, `removeWord`, `hasWord`, or `getWords` consistently fail their unit tests, indicating a fundamental flaw in the word management logic or `kv-store` interaction.
*   **`isValidWord` Logic Flaw:** If the `isValidWord` implementation cannot reliably distinguish between valid and invalid words based on reasonable criteria, or if the chosen criteria prove unworkable.
*   **Performance Degradation:** If basic CRUD operations on a reasonable number of words (e.g., 1000 words) show unacceptable performance, indicating an inefficient use of `kv-store` or internal data structures.