# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G132-100

This document serves as the SSOT foundation for proving the correct implementation and data flow for user marketing consent propagation as defined by AMENDMENT_41_MARKETINGOS.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a verifiable, end-to-end proof that a user's marketing consent status, once updated within the LifeOS platform, is accurately and immediately propagated to the MarketingOS system, ensuring compliance and consistent user experience. Specifically, the proof needs to cover the event emission, consumption, and final state update in MarketingOS.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
a.  Ensuring the `UserConsentUpdated` event is reliably emitted from the `UserService` upon any change to a user's marketing consent preferences.
b.  Implementing or verifying an existing `MarketingOSIntegrationService` listener for `UserConsentUpdated` events.
c.  Within the `MarketingOSIntegrationService`, calling the appropriate MarketingOS API endpoint to update the user's consent status.
This slice focuses on leveraging existing eventing patterns and integration services without introducing new core features or data models.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/UserService.js`: Verify or add event emission for `UserConsentUpdated` after a successful consent update.
*   `src/events/publishers/UserEventsPublisher.js`: Ensure `publishUserConsentUpdated` method exists and is correctly invoked.
*   `src/integrations/MarketingOSIntegrationService.js`: Implement or extend the event listener for `UserConsentUpdated` and the logic to call the MarketingOS API.
*   `src/integrations/marketingos/api.js`: Add or verify the `updateUserConsent` API client method.

## 4. Verifier/Runtime Checks

1.  **Manual UI/API Update:** As a test user, navigate to the LifeOS user profile settings and toggle marketing consent (e.g., opt-in then opt-out).
2.  **LifeOS Event Log Check:** Monitor LifeOS internal event logs (e.g., using `pino` or similar logging) for `UserConsentUpdated` events, verifying the `userId` and `newConsentStatus` payload.
3.  **MarketingOS Integration Service Log Check:** Monitor logs for `MarketingOSIntegrationService` to confirm it received the `UserConsentUpdated` event and initiated an API call to MarketingOS. Look for successful API response logs.
4.  **MarketingOS System Verification:** Directly query the MarketingOS system (via its admin UI, API, or database if accessible) for the test user's profile to confirm their marketing consent status accurately reflects the change made in LifeOS.
5.  **Automated Test (Optional but Recommended):** Write an integration test that simulates a user consent update in LifeOS and asserts the final state in a mocked MarketingOS service.

## 5. Stop Conditions if Runtime Truth Disagrees

*   The `UserConsentUpdated` event is not emitted from `UserService` upon a consent change.
*   The `MarketingOSIntegrationService` does not log receipt of the `UserConsentUpdated` event.
*   The `MarketingOSIntegrationService` logs errors when attempting to call the MarketingOS API.
*   The marketing consent status for the test user in MarketingOS does not match the status set in LifeOS after a reasonable propagation delay (e.g., 5 seconds).
*   Any observed performance degradation or increased error rates in the `UserService` or `MarketingOSIntegrationService` after the changes.
*   Discrepancies in consent status between LifeOS and MarketingOS persist across multiple test runs.