BuilderOS Remediation: AMENDMENT_01_AI_COUNCIL - Groq/Gemini Fallback (TODO-7-G5)

This memo outlines a builder-ready enhancement for implementing the automatic Groq to Gemini fallback mechanism as specified in `AMENDMENT_01_AI_COUNCIL.md`. The primary objective is to establish a robust and resilient AI model interaction layer within BuilderOS, ensuring continuity of operations even when primary AI providers face temporary limitations.

1.  **Blocking Ambiguity / Founder Decision List**
    *   **Definition of "Groq exhausted":** A precise list of Groq API error codes, HTTP statuses (e.g., 429 Too Many Requests, 5xx Server Errors), or specific response payloads that definitively signal an "exhausted