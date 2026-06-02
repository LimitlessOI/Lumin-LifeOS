Amendment 16 Word Keeper - Proof Gate G148-100: Core WordKeeper Module Initialization and Lookup
This document outlines the next smallest build slice for the Amendment 16 Word Keeper project, focusing on establishing the foundational `WordKeeper` module. This proof gate (G148-100) ensures the basic capability to store and efficiently check for the presence of words within BuilderOS contexts.

### 1. Exact Missing Implementation / Proof Gap

The core `WordKeeper` module, responsible for storing a collection of words and providing an efficient lookup mechanism, is not yet implemented. Specifically, the `WordKeeper` class/object with methods for adding words and checking for their existence is missing. This gap prevents any BuilderOS feature from leveraging a standardized, performant word-checking utility.

### 2. Smallest Safe Build Slice

Implement a `WordKeeper` class that uses an internal `Set` to store words. It will expose two primary methods: `addWord(word: string)` and `hasWord(word: string): boolean`. This slice focuses solely on the in-memory storage and lookup functionality, without persistence or external dependencies, ensuring minimal scope and maximum testability. Words should be stored and checked case-insensitively.

**Conceptual Implementation Snippet:**
```javascript
// src/builderos/wordKeeper.js
export class WordKeeper {
  /** @private @type {Set<string>} */
  #words;

  constructor() {
    this.#words = new Set();
  }

  /**
   * Adds a word to the keeper. Words are stored in lowercase.
   * @param {string} word The word to add.
   * @throws {Error} If the word is not a non-empty string.
   */
  addWord(word) {
    if (typeof word !== 'string' || word.trim() === '') {
      throw new Error('Word must be a non-empty string.');
    }
    this.#words.add(word.toLowerCase());
  }

  /**
   * Checks if a word exists in the keeper (case-insensitive).
   * @param {string} word The word to check.
   * @returns {boolean} True if the word exists, false otherwise.
   */
  hasWord(word) {
    if (typeof word !== 'string' || word.trim() === '') {
      return false;
    }
    return this.#words.has(word.toLowerCase());
  }

  /**
   * Returns the number of unique words currently stored.
   * @returns {number}
   */
  get size() {
    return this.#words.size;
  }
}
```

### 3. Exact Safe-Scope Files to Touch First

*   `src/builderos/wordKeeper.js` (new file)
*   `src/builderos/wordKeeper.test.js` (new file for unit tests)

### 4. Verifier / Runtime Checks

*   **Unit Tests (`src/builderos/wordKeeper.test.js`):**
    *   Verify `addWord` correctly adds unique words, handling case-insensitivity.
    *   Verify `hasWord` accurately identifies existing and non-existing words, handling case-insensitivity.
    *   Verify the `size` getter correctly reflects the count of unique words.
    *   Test edge cases: adding/checking empty strings, strings with only whitespace, and non-string inputs (expecting errors or `false` as appropriate).
*   **Integration Check (within BuilderOS context):**
    *   Ensure `WordKeeper` can be imported and instantiated within a BuilderOS module (e.g., a temporary BuilderOS utility script).
    *   Verify basic `addWord` and `hasWord` operations function correctly when integrated into a minimal BuilderOS flow.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If unit tests for `WordKeeper` fail, indicating fundamental logic errors in word storage or lookup.
*   If `WordKeeper` cannot be imported or instantiated in the BuilderOS environment due to module resolution issues, dependency conflicts, or unexpected runtime errors.
*   If `addWord` or `hasWord` exhibit performance characteristics significantly worse than expected `O(1)` average time complexity for typical BuilderOS word list sizes (e.g., lists up to 10,000 words).