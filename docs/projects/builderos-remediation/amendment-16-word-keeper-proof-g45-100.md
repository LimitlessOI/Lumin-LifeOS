<!-- SYNOPSIS: Amendment 16: Word Keeper - Proof G45-100: Initial `word-keeper.json` Definition -->

# Amendment 16: Word Keeper - Proof G45-100: Initial `word-keeper.json` Definition

This document outlines the next smallest build slice for the Word Keeper feature, focusing on the foundational `src/config/word-keeper.json` file.

---

**Blueprint Note for C2 Build Pass:**

1.  **Exact missing implementation or proof gap:** The initial definition and population of the `src/config/word-keeper.json` file. This file is the single source of truth for all critical words and phrases, categorized for consistent platform usage.
2.  **Smallest safe build slice to close it:** Create the `src/config/word-keeper.json` file with a minimal, valid JSON structure, including at least one example critical word category and associated terms.
3.  **Exact safe-scope files to touch first:**
    *   `src/config/word-keeper.json`
4.  **Verifier/runtime checks:**
    *   **File Existence:** Confirm `src/config/word-keeper.json` exists at the specified path.
    *   **JSON Validity:** Attempt to parse the content of `src/config/word-keeper.json` as valid JSON.
    *   **Schema Adherence (Minimal):** Verify the parsed JSON is a top-level object where each key represents a word category (string) and its value is an array of strings (the critical words/phrases).
    *   **Example Content:** Ensure the file contains at least one category (e.g., "productNames") with at least one term (e.g., "LifeOS Platform").
5.  **Stop conditions if runtime truth disagrees:**
    *   If `src/config/word-keeper.json` does not exist.
    *   If `src/config/word-keeper.json` contains malformed or invalid JSON.
    *   If the parsed JSON does not conform to the expected top-level structure (e.g., not an object, or values are not arrays of strings).
    *   If the file is empty or contains no defined word categories.

---

**Proposed `src/config/word-keeper.json` content for this slice:**

```json
{
  "productNames": [
    "LifeOS Platform",
    "BuilderOS"
  ],
  "keyTerms": [
    "User Experience",
    "Data Integrity",
    "System Health"
  ]
}
```