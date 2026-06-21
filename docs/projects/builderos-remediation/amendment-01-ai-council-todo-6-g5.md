<!-- SYNOPSIS: Documentation — Amendment 01 Ai Council Todo 6 G5. -->

BuilderOS Blueprint Enhancement Memo: AMENDMENT_01_AI_COUNCIL - todo-6-g5 Remediation

This memo outlines the next buildable slice for addressing `todo-6-g5` related to the `/api/v1/chat` endpoint's AI provider prioritization, as per the AMENDMENT_01_AI_COUNCIL blueprint. The core objective is to ensure Groq is the primary AI provider for this endpoint.

1.  **Blocking Ambiguity / Founder Decision List:**
    *   **A1: Groq Availability and Fallback Strategy:** The blueprint states "Groq first." This implies a fallback if Groq is unavailable, rate-limited, or returns an error. The exact fallback mechanism (e.g., immediate failover to the next configured provider, specific error response, retry logic) needs explicit definition. *Founder decision required on specific fallback behavior.*
    *   **A2: Configuration vs. Dynamic Selection:** Is the "Groq first" prioritization a static, environment-variable-driven configuration, or should there be dynamic logic based on factors like user tier, request payload, cost optimization, or real-time provider performance? *Assumption for this slice: Static configuration for initial implementation.*

2.  **Already-Settled Constraints:**
    *   Target endpoint: `/api/v1/chat`.
    *   Primary AI provider for this endpoint: Groq.
    *   No modifications to LifeOS user features or TSOS customer-facing surfaces.
    *   BuilderOS-only governed execution.
    *   Blueprint source: `AMENDMENT_01_AI_COUNCIL.md`.

3.  **Smallest Buildable Next Slice:**
    Introduce a `providerPriorityList` configuration for the `/api/v1/chat` endpoint, explicitly listing `['groq', 'openai', ...]` or similar. Modify the chat handler to iterate through this list, attempting to use the first available and functional provider. Ensure that the `*tul` provider column is updated with the name of the AI provider that successfully processed the request. This slice focuses on the core routing and logging.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First:**
    *   `src/api/v1/chat/chat.controller.js` (or equivalent file handling `/api/v1/chat` logic)
    *   `src/utils/aiProviderManager.js` (or equivalent file abstracting AI provider selection/invocation)
    *   `src/config/aiProviders.js` (or equivalent for provider configuration)

5.  **Required Verifier/Runtime Checks:**
    *   **V1: Groq Prioritization:** Execute multiple `/api/v1/chat` requests. Verify that when Groq is operational, it is consistently selected as the AI provider.
    *   **V2: `*tul` Logging Accuracy:** For requests processed by Groq, confirm that the `provider` column in the `token_usage_log` (or equivalent) accurately records 'groq'.
    *   **V3: Fallback Mechanism Validation:** Configure Groq to be unavailable (e.g., by invalidating its API key or simulating a network error). Execute `/api/v1/chat` requests and verify that the system gracefully falls back to the next configured provider (e.g., OpenAI) and that the `*tul` log reflects this fallback provider.
    *   **V4: Error Handling:** Verify that if all configured providers fail, an appropriate error response is returned to the client without crashing the service.
    *   **V5: No Regressions:** Conduct smoke tests on other AI-dependent endpoints to ensure no unintended side effects or performance degradations.

6.  **Stop Conditions:**
    *   The `/api/v1/chat` endpoint successfully prioritizes Groq for AI interactions.
    *   The `*tul` provider column accurately reflects the AI provider used for `/api/v1/chat` requests.
    *   The fallback mechanism to another AI provider is functional and verified.
    *   All verifier checks pass without regressions.