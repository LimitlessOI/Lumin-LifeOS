# AMENDMENT 41: MarketingOS Proof G551-100 - Proof-Closing Blueprint Note

This document serves as the SSOT foundation for closing the proof gap identified in Amendment 41 regarding MarketingOS integration, specifically for proof G551-100.

---

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of verifiable proof that `UserAccountCreated` events originating from LifeOS are reliably and accurately transmitted to MarketingOS, and subsequently processed to update user profiles or trigger initial welcome sequences. While the event emission mechanism is in place, the end-to-end data flow and MarketingOS consumption have not been fully proven for this specific event type. This impacts the foundational data synchronization required for new user onboarding campaigns.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Verifying the `UserAccountCreated` event payload structure and emission point.
*   Confirming the MarketingOS integration service's listener for this specific event.
*   Ensuring the data transformation logic within the MarketingOS integration service correctly maps LifeOS user data to MarketingOS user properties.
*   Executing a test user creation flow and observing the event's journey through the system to MarketingOS.
*   Adding a dedicated integration test to assert the end-to-end flow.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/userService.js`: Review `createUser` method for `UserAccountCreated` event emission.
*   `src/events/eventBus.js`: Confirm `UserAccountCreated` event registration and listener setup.
*   `src/integrations/marketingos/marketingosEventHandler.js`: Focus on the handler for `UserAccountCreated` events, specifically the data mapping and API call logic.
*   `src/integrations/marketingos/marketingosApi.js`: Review the `sendUserData` or equivalent method called by the event handler.
*   `tests/integrations/marketingos/userAccountCreated.test.js`: Create or extend an integration test to simulate user creation and assert MarketingOS API interaction.

### 4. Verifier/Runtime Checks

1.  **LifeOS Event Bus Logs:** Monitor `eventBus` logs for `UserAccountCreated` event emission upon new user registration. Verify payload correctness.
2.  **MarketingOS Integration Service Logs:** Check logs for `marketingosEventHandler` to confirm receipt of the `UserAccountCreated` event and successful processing (e.g., "MarketingOS API call successful for user X").
3.  **MarketingOS API Gateway Logs:** If accessible, verify that the MarketingOS API received a `POST` request to its user creation/update endpoint with the expected user data.
4.  **MarketingOS UI/Database:** Manually or programmatically verify that the newly created user appears in MarketingOS with the correct profile attributes (e.g., email, signup date, source).
5.  **Automated Integration Test:** The new test in `tests/integrations/marketingos/userAccountCreated.test.js` should pass, asserting the full flow without external manual checks.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Event Not Emitted:** If `UserAccountCreated` event is not logged by `eventBus` after user creation.
*   **Event Not Received by Handler:** If `marketingosEventHandler` logs do not show receipt and processing of the event.
*   **API Call Failure:** If `marketingosEventHandler` logs indicate a failure in calling the MarketingOS API (e.g., HTTP 4xx/5xx errors).
*   **Data Mismatch/Absence in MarketingOS:** If the user profile in MarketingOS is not created, or critical data points (e.g., email, signup timestamp) are missing or incorrect.
*   **Integration Test Failure:** If `tests/integrations/marketingos/userAccountCreated.test.js` fails.

---