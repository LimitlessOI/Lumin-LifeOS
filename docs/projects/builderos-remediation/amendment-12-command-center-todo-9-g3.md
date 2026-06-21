<!-- SYNOPSIS: Amendment 12 Command Center: Chat API Key Remediation (TODO-9-G3) -->

# Amendment 12 Command Center: Chat API Key Remediation (TODO-9-G3)

## 1. Blocking Ambiguity / Founder Decision List

*   **API Key Source & Management:**
    *   Is there an existing secure key management solution (e.g., AWS Secrets Manager, Vault) for sensitive API keys? If so, what is the established pattern for retrieval?
    *   If not, should the key be sourced from an environment variable (`CHAT_API_KEY`) or a configuration file?
    *   What is the intended lifecycle and rotation strategy for this key?
*   **Key Scope:** Is the key global for the service, or does it need to be user-specific or context-specific? (Assumption for this slice: Global service key).

## 2. Already-Settled Constraints

*   The chat functionality currently returns HTTP 401 (Unauthorized) when an API key is not provided in requests.
*   The remediation must ensure an API key is present in chat service requests.
*   BuilderOS-only governed loop execution; no direct modification of LifeOS user features or TSOS customer-facing surfaces.
*   The solution must adhere to existing Node/ESM patterns.

## 3. Smallest Buildable Next Slice

Implement a basic mechanism to inject a placeholder API key into outgoing chat service requests. This slice focuses solely on making the 401 error due to a *missing* key disappear, using a static or environment-variable-sourced key.

**Steps:**
1.  Define a new environment variable (e.g., `CHAT_SERVICE_API_KEY`) for the placeholder key.
2.  Load this environment variable into the application's configuration.
3.  Modify the chat service client to include an `Authorization` header (or equivalent) with the loaded key in all relevant requests.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/config/env.js`: Add `CHAT_SERVICE_API_KEY` to environment variable loading and validation.
*   `src/services/chatService.js`: Modify the HTTP client (e.g., `fetch` or `axios` instance) used for chat API calls to include the `Authorization` header.
*   `src/utils/apiClient.js` (if exists and is a common client): Potentially modify a shared API client to inject the header based on service context. (Prioritize `chatService.js` if no common client).

## 5. Required Verifier / Runtime Checks

*   **Unit Test (`src/services/chatService.test.js`):**
    *   Verify that `chatService.sendChatMessage()` (or similar) includes an `Authorization: Bearer <key>` header when `CHAT_SERVICE_API_KEY` is set.
    *   Verify that `chatService.sendChatMessage()` throws an error or logs a warning if `CHAT_SERVICE_API_KEY` is missing or empty.
*   **Integration Test:**
    *   Deploy with a dummy `CHAT_SERVICE_API_KEY`. Make a request to a chat endpoint. Assert that the response is not a 401 due to a *missing* key (it might be 403 or 200 depending on the dummy key's validity, but not 401 for *missing*).
*   **Runtime Check:**
    *   Log a `WARN` message at application startup if `process.env.CHAT_SERVICE_API_KEY` is not defined or is empty.

## 6. Stop Conditions

*   Chat service requests no longer result in HTTP 401 errors specifically due to a *missing* API key.
*   A placeholder API key is successfully retrieved and injected into all outgoing chat service requests.
*   All specified unit, integration, and runtime checks pass.
*   The solution adheres to the "smallest buildable next slice" principle without introducing new founder decisions.