<!-- SYNOPSIS: AMENDMENT 16: WORD KEEPER - Proof G130-100 -->

# AMENDMENT 16: WORD KEEPER - Proof G130-100

## Proof-Closing Blueprint Note

This note addresses the initial implementation gap for the Word Keeper system, focusing on establishing its core internal components.

1.  **Exact missing implementation or proof gap:**
    The foundational data model (`WordEntry`), its persistence layer (`WordRepository`), and the core business logic for managing words (`WordService`) are not yet implemented. Specifically, the ability to define a word, persist it, and update its status is missing.

2.  **Smallest safe build slice to close it:**
    Implement the `WordEntry` data model, a basic `WordStatus` enumeration, the `WordRepository` with `create`, `findById`, and `updateStatus` methods, and the `WordService` with `addWord` and `updateWordStatus` methods. This slice establishes the internal core for word management without exposing external APIs or event streams.

3.  **Exact safe-scope files to touch first:**
    *   `src/domain/word-keeper/WordEntry.js`
    *   `src/domain/word-keeper/WordStatus.js`
    *   `src/domain/word-keeper/index.js`
    *   `src/infra/word-keeper/WordRepository.js` (initial in-memory or mock implementation)
    *   `src/infra/word-keeper/index.js`
    *   `src/app/word-keeper/WordService.js`
    *   `src/app/word-keeper/index.js`

4.  **Verifier/runtime checks:**
    *   **Unit Tests (`WordEntry.js`):** Verify `WordEntry` constructor correctly initializes properties and handles default values (e.g., `status`, `version`, `created_at`).
    *   **Unit Tests (`WordRepository.js`):**
        *   `create(wordEntry)`: Successfully stores a `WordEntry` and returns it.
        *   `findById(id)`: Retrieves the correct `WordEntry` by ID, or `null` if not found.
        *   `updateStatus(id, newStatus)`: Changes the status of an existing `WordEntry` and returns the updated entry.
    *   **Unit Tests (`WordService.js`):**
        *   `addWord(word, language, source)`: Calls `WordRepository.create` with a new `WordEntry` and returns the created word. Verifies default status is applied.
        *   `updateWordStatus(id, newStatus)`: Calls `WordRepository.updateStatus` and returns the updated word.
    *   **Integration Test (`WordService` to `WordRepository`):**
        *   Scenario: `addWord` -> `