### Proof-Closing Blueprint Note: AMENDMENT_01_AI_COUNCIL - G37-100

This note closes proof `g37-100` for `AMENDMENT_01_AI_COUNCIL`, focusing on the foundational definition of the AI Council's initial membership.

1.  **Exact missing implementation or proof gap:**
    The initial, static definition of the AI Council's core membership roster and their designated roles is missing. This foundational data is required before any operational logic or dynamic management of the council can be considered.

2.  **Smallest safe build slice to close it:**
    Establish a dedicated configuration file to store the initial AI Council member data as a static, immutable list. This avoids database changes or complex API endpoints for the very first iteration, adhering to the smallest safe slice principle.

3.  **Exact safe-scope files to touch first:**
    *   `config/aiCouncil.js`: Create this new file to define the initial council members.
    *   `src/utils/aiCouncil.js`: Create this new utility file to provide a simple, read-only accessor for the `config/aiCouncil.js` data.
    *   `tests/unit/aiCouncil.test.js`: Create a new unit test file to verify the structure and accessibility of the council membership data.

4.  **Verifier/runtime checks:**
    *   **File Existence:** Confirm `config/aiCouncil.js` and `src/utils/aiCouncil.js` exist.
    *   **Configuration Structure:** Verify `config/aiCouncil.js` exports an array of objects, where each object contains at least `id` (string, e.g., a user ID or system identifier) and `role` (string, e.g., 'Chair', 'Member', 'Observer').
    *   **Utility Access:** Ensure `src/utils/aiCouncil.js` successfully imports and exposes the member list from `config/aiCouncil.js` via a simple getter function (e.g., `getMembers()`).
    *   **Unit Test Pass:** All tests in `tests/unit/aiCouncil.test.js` pass, asserting the correct data structure and content.

5.  **Stop conditions if runtime truth disagrees:**
    *   If `config/aiCouncil.js` is not found or contains malformed JSON/JS export.
    *   If `src/utils/aiCouncil.js` fails to import `config/aiCouncil.js` or exposes an empty/incorrect member list.
    *   If the `getMembers()` function in `src/utils/aiCouncil.js` returns data that does not conform to the `[{ id: string, role: string }]` schema.
    *   If any unit tests in `tests/unit/aiCouncil.test.js` fail.