Blueprint Enhancement Memo: AMENDMENT_12_COMMAND_CENTER - Chat 401 Remediation (TODO-9-G3)

This memo addresses the "Chat returns 401 without key" issue identified in the AMENDMENT_12_COMMAND_CENTER blueprint, specifically for task TODO-9-G3. The goal is to enable the chat functionality to proceed past the 401 Unauthorized error by ensuring the correct API key is provided.

### 1. Blocking Ambiguity or Founder Decision List

*   **Source of Chat API Key:** The blueprint does not specify the exact source or name of the chat service API key.
    *   **Decision Required:** Confirm the environment variable name (e.g., `CHAT_SERVICE_API_KEY`) or alternative secure storage mechanism for the chat service API key.
*   **Authentication Scheme:** The blueprint implies a missing key but not the specific authentication scheme (e.g., Bearer token, custom header, query parameter).
    *   **Decision Required:** Confirm the expected authentication header/parameter name and format (e.g., `Authorization: Bearer <key>`).
*   **Specific Chat Endpoint:** The exact endpoint returning 401 is not specified, requiring identification of the relevant API client call.

### 2. Already-Settled Constraints

*   The remediation must resolve the 401 Unauthorized error for chat functionality.
*   No modifications to LifeOS user features or TSOS customer-facing surfaces.
*   Implementation must remain within approved BuilderOS safe scope.
*   The fix should enable chat functionality to proceed past the 401.

### 3. Smallest Buildable Next Slice

The smallest buildable slice focuses on injecting a configured API key into the chat service requests.

1.  **Environment Variable Configuration:** Assume `CHAT_SERVICE_API_KEY` as the environment variable holding the key.
2.  **API Client Modification:** Locate the existing chat service API client (e.g., `src/services/chatService.js` or similar) and modify its request logic to include the `CHAT_SERVICE_API_KEY` in the `Authorization: Bearer` header for all outgoing requests to the chat service.
3.  **Error Handling:** Add a check to ensure `CHAT_SERVICE_API_KEY` is present before making requests; if missing, log a critical error or throw an explicit configuration error.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/services/chatService.js` (or equivalent file responsible for making HTTP requests to the chat backend)
*   `src/config/env.js` (or equivalent for accessing environment variables)
*   `tests/unit/chatService.test.js` (or equivalent for adding unit tests)
*   `tests/integration/chatApi.test.js` (or equivalent for adding integration tests)

### 5. Required Verifier/Runtime Checks

*   **Unit Test:** Verify that `chatService.js` (or equivalent) correctly adds the `Authorization: Bearer <key>` header when `CHAT_SERVICE_API_KEY` is set.
*   **Unit Test:** Verify that `chatService.js` (or equivalent) throws or logs an error if `CHAT_SERVICE_API_KEY` is not set.
*   **Integration Test:** Mock the chat service endpoint to return 200 OK and assert that the request sent from BuilderOS includes the correct `Authorization` header.
*   **Runtime Check:** During application startup or before the first chat request, log a warning if `process.env.CHAT_SERVICE_API_KEY` is undefined.
*   **Functional Test:** Deploy the change to a staging environment and verify that chat interactions no longer result in 401 errors and function as expected.

### 6. Stop Conditions

*   Chat API requests no longer return 401 Unauthorized errors due to missing or incorrect API keys.
*   Chat functionality is fully operational and integrated as per the original blueprint's intent.
*   All new code paths related to API key injection are covered by automated tests.
*   No regressions are introduced to existing BuilderOS or LifeOS features.
*   The `CHAT_SERVICE_API_KEY` is securely managed and accessed.