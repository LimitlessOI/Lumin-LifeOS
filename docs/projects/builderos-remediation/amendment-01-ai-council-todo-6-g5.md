BuilderOS Remediation: Amendment 01 AI Council - Groq First for /api/v1/chat

This memo outlines the next buildable slice for implementing Groq as the primary LLM provider for the `/api/v1/chat` endpoint, addressing the open task from `AMENDMENT_01_AI_COUNCIL.md`. The goal is to ensure `/api/v1/chat` prioritizes Groq for LLM interactions and correctly logs this usage in the token usage log (TUL).

---

### 1. Blocking Ambiguity / Founder Decision List

*   **Fallback Strategy:** What is the desired behavior if Groq API calls fail or are unavailable?
    *   Option A: Fallback to the previously configured primary provider (e.g., OpenAI).
    *   Option B: Return an error to the client, indicating Groq unavailability.
    *   Option C: Implement a retry mechanism for Groq before falling back or erroring.
    *   *Current assumption for smallest slice: Implement basic error handling for Groq failure, returning an error to the client, pending explicit fallback strategy.*
*   **Groq API Key Management:** How should the `GROQ_API_KEY` be securely provided to the application? (e.g., `process.env.GROQ_API_KEY`, secret manager integration).
    *   *Current assumption for smallest slice: Expect `GROQ_API_KEY` to be available as an environment variable.*
*   **Specific Groq Model:** Is there a preferred Groq model (e.g., `llama3-8b-8192`, `llama3-70b-8192`) or should it be configurable?
    *   *Current assumption for smallest slice: Default to `llama3-8b-8192` and make it configurable via an environment variable (`GROQ_DEFAULT_MODEL`).*

### 2. Already-Settled Constraints

*   **Target Endpoint:** `/api/v1/chat` is the sole endpoint to be modified.
*   **Primary Provider:** Groq must be the first attempt for LLM interactions on this endpoint.
*   **No User/Customer Impact:** LifeOS user features and TSOS customer-facing surfaces must remain unchanged.
*   **BuilderOS Scope:** Modifications are strictly within BuilderOS-governed execution.
*   **Code Standards:** Adhere to existing Node/ESM patterns; extend, do not rebuild.
*   **TUL Logging:** The `token_usage_log` (TUL) `provider` column must accurately reflect 'Groq' when Groq is used.

### 3. Smallest Buildable Next Slice

The immediate next slice focuses on integrating Groq as the primary provider for `/api/v1/chat` without implementing complex fallback logic initially.

1.  **Groq API Client Integration:** Create or extend an LLM service to include a Groq client.
2.  **Endpoint Handler Modification:** Update the `/api/v1/chat` handler to prioritize calling the Groq client.
3.  **TUL Integration:** Ensure the `tokenUsageLogger` is updated to record 'Groq' as the provider for successful Groq calls.
4.  **Environment Configuration:** Add necessary environment variables for Groq API key and default model.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/config/env.js`: Add `GROQ_API_KEY` and `GROQ_DEFAULT_MODEL` definitions.
*   `src/services/llmProvider.js` (or similar existing LLM abstraction):
    *   Add a new function/method for interacting with the Groq API.
    *   Modify the existing primary LLM selection logic to prioritize Groq.
*   `src/api/v1/chat/handler.js`: Update the handler to use the Groq-first logic from `llmProvider.js`.
*   `src/utils/tokenUsageLogger.js`: Ensure the `logTokenUsage` function can accept and correctly record 'Groq' as a provider.
*   `package.json`: If a new Groq-specific npm package is deemed necessary (e.g., `@groq/sdk`), add it here. (Prefer direct `fetch` if possible to avoid new dependencies).

### 5. Required Verifier/Runtime Checks

*   **Unit Tests:**
    *   Verify `llmProvider.js` (or equivalent) correctly initializes and calls the Groq API.
    *   Verify `tokenUsageLogger.js` correctly logs 'Groq' as the provider.
*   **Integration Tests:**
    *   Send a request to `/api/v1/chat` and assert that the response comes from Groq.
    *   Query the TUL to confirm the `provider` column for the recent chat interaction is 'Groq'.
    *   Test with `GROQ_API_KEY` missing to ensure graceful error handling (as per assumed fallback).
*   **E2E Tests:** Run existing E2E tests to confirm no regressions in other chat functionalities.

### 6. Stop Conditions

*   `/api/v1/chat` successfully processes requests using Groq as the primary LLM provider.
*   The `token_usage_log` accurately records 'Groq' as the provider for these interactions.
*   All existing unit, integration, and E2E tests pass without new failures.
*   The system handles Groq API unavailability gracefully (as per defined fallback/error strategy).
*   No new external dependencies are introduced unless explicitly approved.