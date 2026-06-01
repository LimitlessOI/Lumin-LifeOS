# BuilderOS Remediation: Amendment 12 Command Center - Chat Response Key Extraction (G3)

This memo outlines the next buildable slice for handling successful chat responses as defined in `AMENDMENT_12_COMMAND_CENTER.md`, specifically focusing on the `{ ok: true, response: "..." }` structure with a "valid key".

---

### 1. Blocking Ambiguity or Founder Decision List

*   **A1.1: Definition of "Valid Key" Content:** The blueprint states "valid key" but does not specify the format or content requirements for the `response` string itself (e.g., regex, minimum length, specific prefixes/suffixes). For this slice, we assume any non-empty string is initially considered a "valid key" placeholder, with deeper validation deferred.
*   **A1.2: Error Handling Strategy:** What is the precise error handling strategy for cases where `ok` is `false`, `response` is not a string, or `response` is an empty string? This slice will throw an error for invalid inputs, but a broader strategy (e.g., specific error types, logging, fallback mechanisms) is needed for integration.

### 2. Already-Settled Constraints

*   **C2.1: Expected Return Shape:** The chat interaction returns an object `{ ok: boolean, response: string }`.
*   **C2.2: Success Condition:** A successful chat interaction is indicated by `ok: true`.
*   **C2.3: Key Location:** The "valid key" is contained within the `response` string field of the successful return object.

### 3. Smallest Buildable Next Slice

Implement a pure utility function, `extractChatResponseKey`, that takes the raw chat response object. This function will:
1.  Validate that the input object has `ok: true`.
2.  Validate that the `response` field exists and is a non-empty string.
3.  Return the `response` string.
This slice focuses solely on the successful extraction of the key string, deferring any further processing or validation of the key's content.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/command-center/utils/chatResponseParser.js` (new file)
*   `src/command-center/utils/chatResponseParser.test.js` (new file for unit tests)

### 5. Required Verifier