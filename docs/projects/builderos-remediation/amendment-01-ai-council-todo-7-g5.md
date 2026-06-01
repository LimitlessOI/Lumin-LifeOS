BuilderOS Remediation: Amendment 01 AI Council - TODO 7 G5
Blueprint Enhancement Memo: Groq to Gemini Automatic Fallback

This memo outlines the next buildable slice for implementing automatic fallback from Groq to Gemini when Groq resources are exhausted, as per the `AMENDMENT_01_AI_COUNCIL.md` blueprint.

1.  **Blocking Ambiguity or Founder Decision List:**
    *   **Definition of "Groq exhausted":** What specific API error codes, HTTP statuses, or rate limit responses from Groq constitute "exhausted" and trigger fallback? Is it only rate limits, or also service unavailability?
    *   **Fallback Retry Policy:** Should there be a retry mechanism for Groq before falling back to Gemini (e.g., 1-2 retries with exponential backoff), or an immediate fallback?
    *   **Gemini Cost/Priority:** Is Gemini always an acceptable fallback, or are there scenarios where a different action (e.g., fail, wait) is preferred due to cost or specific model capabilities?
    *   **Context Transfer:** Are there any specific considerations for transferring conversational context or session state when switching LLM providers? (Assuming current LLM calls are stateless for this slice).

2.  **Already-Settled Constraints:**
    *   Automatic fallback from Groq to Gemini is required.
    *   No modifications to LifeOS user features or TSOS customer-facing surfaces.
    *   Implementation must leverage existing LLM abstraction layers.
    *   BuilderOS-governed loop execution.

3.  **Smallest Buildable Next Slice:**
    *   **Objective:** Implement a basic, immediate fallback from Groq to Gemini upon a defined "exhausted" condition.
    *   **Steps:**
        1.  Identify the primary function responsible for making Groq API calls within the LLM abstraction layer.
        2.  Wrap the Groq API call with a `try-catch` block.
        3.  Inside the `catch` block, check for specific error conditions (e.g., HTTP 429 Too Many Requests, specific Groq API error codes indicating rate limits or resource exhaustion).
        4.  If an "exhausted" condition is met, log the fallback event (e.g., `logger.warn('Groq exhausted, falling back to Gemini.')`).
        5.  Invoke the Gemini provider via the existing LLM abstraction, passing the original request parameters.
        6.  If the error is not an "exhausted" condition, re-throw the original error.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First:**
    *   `src/services/llmProvider.js` (or similar file responsible for abstracting LLM calls and selecting providers)
    *   `src/config/aiModels.js` (if specific error codes or fallback logic need configuration)
    *   `src/lib/logger.js` (for logging fallback events)

5.  **Required Verifier/Runtime Checks:**
    *   **Unit Tests:**
        *   Simulate Groq API returning a "rate limit" or "exhausted" error. Verify that the `llmProvider.js` function correctly calls the Gemini provider.
        *   Simulate Groq API returning a non-exhaustion error. Verify that the error is re-thrown and Gemini is *not* called.
    *   **Integration Tests:**
        *   Deploy a test environment where Groq is configured to immediately return exhaustion errors. Verify that features relying on LLM calls continue to function using Gemini.
    *   **Runtime Monitoring:**
        *   Ensure fallback events are logged and can be monitored (e.g., via Prometheus metrics, Sentry alerts).

6.  **Stop Conditions:**
    *   Successful execution of LLM-dependent features when Groq is simulated as "exhausted," with Gemini providing the response.
    *   Fallback events are accurately logged and observable in monitoring systems.
    *   No regressions or unexpected behavior in existing LLM-dependent functionalities.
    *   The implementation adheres to the defined "smallest buildable next slice" without introducing unnecessary complexity.