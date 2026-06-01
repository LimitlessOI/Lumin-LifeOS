BuilderOS Remediation: Amendment 01 AI Council - TODO 6-G5: Groq-First for /api/v1/chat

This memo outlines the next buildable slice for implementing Groq-first provider selection for the `/api/v1/chat` endpoint, addressing the "unchecked blueprint task remains open" status of the AMENDMENT_01_AI_COUNCIL blueprint. This enhancement focuses on integrating Groq as the primary AI provider for chat interactions and ensuring its usage is correctly logged.

### 1. Blocking Ambiguity or Founder Decision List

*   **Groq Provider Configuration:** Is there an existing configuration mechanism (e.g., environment variables, `config` file, feature flag) for Groq API keys, endpoint URLs, and other parameters? If not, a standard pattern needs to be established.
*   **Fallback Strategy:** What is the explicit fallback provider if Groq is unavailable, fails, or exceeds rate limits? Is it the previously default provider, or should a specific fallback be configured?
*   **Provider Selection Logic:** How is the "Groq first" preference implemented? Is it a simple conditional check, or does it integrate with a more sophisticated provider orchestration layer (e.g., based on latency, cost, or specific model availability)?
*   **`*tul` Integration:** What is the exact API/function signature for updating the `token_usage_log` with the selected provider? Does it accept a provider name string, an enum, or an object?

### 2. Already-Settled Constraints

*   **Target Endpoint:** `/api/v1/chat` only.
*   **Primary Provider:** Groq must be the first choice.
*   **Logging:** Provider selection must be recorded in the `*tul` (token_usage_log) provider column.
*   **Scope:** BuilderOS-only governed loop execution. No modification of LifeOS user features or TSOS customer-facing surfaces.
*   **Existing Patterns:** Adhere to existing Node/ESM code patterns. Extend, do not rebuild.

### 3. Smallest Buildable Next Slice

The smallest buildable slice involves modifying the `/api/v1/chat` handler to:
1.  Attempt to initialize and use the Groq provider.
2.  If Groq is successfully used, log "Groq" to `*tul`.
3.  If Groq initialization fails or the call to Groq fails, fall back to the previously default AI provider.
4.  Log the fallback provider to `*tul` if Groq is not used.
This slice focuses on the core provider selection and logging, deferring complex orchestration or dynamic fallback strategies.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/api/v1/chat/chat.service.js` (or `chat.controller.js`): To modify the AI provider selection logic for the `/api/v1/chat` endpoint.
*   `src/services/aiProvider.js` (or similar, e.g., `src/utils/llmProvider.js`): To potentially add or modify Groq integration logic and abstract provider selection.
*   `src/utils