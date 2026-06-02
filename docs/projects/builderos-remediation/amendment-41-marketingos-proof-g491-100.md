# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - User Consent Status Sync (g491-100)

This document serves as a proof-closing blueprint note for the specific implementation and verification of user consent status synchronization between LifeOS and MarketingOS, as foundationalized by `AMENDMENT_41_MARKETINGOS.md`.

---

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a fully verified, end-to-end, real-time synchronization mechanism for `User Consent Status` (specifically, marketing opt-in/opt-out) from LifeOS to MarketingOS, ensuring data consistency and compliance. This includes the event emission, propagation, and successful update within the MarketingOS system.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice focuses on establishing a robust, event-driven flow for a single user's marketing consent status change:

1.  **LifeOS Event Emission:** When a user's marketing consent status changes in LifeOS, an explicit event (`UserConsentStatusChanged`) is emitted.
2.  **LifeOS Event Listener/Processor:** A dedicated service or worker listens for `UserConsentStatusChanged` events.
3.  **MarketingOS API Integration:** This processor calls the MarketingOS API to update the user's consent status.
4.  **Error Handling & Retries:** Implement robust error handling, including retry mechanisms for transient MarketingOS API failures.
5.  **Idempotency:** Ensure the MarketingOS API integration is idempotent to handle duplicate events safely.

### 3. Exact Safe-Scope Files to Touch First

Based on existing LifeOS patterns for Node/ESM services and integrations:

*   `src/services/userConsentService.js`: Add event emission logic upon consent status change.
*   `src/events/userEvents.js`: Define `UserConsentStatusChanged` event schema.
*   `src/integrations/marketingos/marketingosClient.js`: Implement or extend the client for MarketingOS API calls (e.g., `updateUserConsentStatus`).
*   `src/integrations/marketingos/marketingosSyncWorker.js`: Create or extend a worker to consume `UserConsentStatusChanged` events and orchestrate the `marketingosClient` call.
*   `src/tests/unit/userConsentService.test.js`: Add unit tests for event emission.
*   `src/tests/unit/marketingosSyncWorker.test.js`: Add unit tests for event consumption and API call orchestration.
*   `src/tests/integration/marketingosConsentSync.test.js`: Add an integration test simulating a user consent change and verifying the end-to-end flow (mocking MarketingOS API).

### 4. Verifier/Runtime Checks

*   **Unit Tests:** All new/modified functions (event emission, API client calls, worker logic) pass their respective unit tests.
*   **Integration Tests:** The `marketingosConsentSync.test.js` integration test passes, confirming event flow and mocked API interaction.
*   **Staging Environment E2E:**
    *   Manually change a test user's marketing consent status in LifeOS UI.
    *   Verify that the corresponding consent status is updated in the connected MarketingOS instance (via MarketingOS UI or API query).
    *   Monitor LifeOS logs for `UserConsentStatusChanged` event emission and `marketingosSyncWorker` processing.
    *   Monitor MarketingOS API call logs for successful `updateUserConsentStatus` requests.
*   **Observability:** Ensure metrics are emitted for event processing success/failure rates and MarketingOS API call latencies/errors.

### 5. Stop Conditions if Runtime Truth Disagrees

The proof is considered *not closed* and requires immediate investigation/rollback if any of the following occur in a staging or production environment:

*   **Data Mismatch:** A user's marketing consent status in MarketingOS does not accurately reflect their status in LifeOS within 5 minutes of a change.
*   **Event Loss:** `UserConsentStatusChanged` events are emitted by LifeOS but are not consumed by `marketingosSyncWorker` (e.g., dead-letter queue accumulation).
*   **API Failures:** Consistent (e.g., >5% error rate over 15 minutes) non-transient errors from the MarketingOS API during consent updates.
*   **Performance Degradation:** Introduction of noticeable latency (>500ms) in user consent updates within LifeOS due to synchronous integration attempts, or significant increase in `marketingosSyncWorker` processing time.
*   **Security/Compliance Breach:** Any indication that consent status is being incorrectly applied, or that unauthorized data is