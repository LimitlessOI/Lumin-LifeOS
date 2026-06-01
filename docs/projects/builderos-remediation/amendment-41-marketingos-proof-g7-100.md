# Proof-Closing Blueprint Note: Amendment 41 - MarketingOS Proof G7-100

This document serves as a proof-closing blueprint note for `AMENDMENT_41_MARKETINGOS.md`, focusing on establishing the Single Source of Truth (SSOT) foundation for user marketing consent.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the verified, real-time synchronization of `User.marketingConsentStatus` from LifeOS (SSOT) to MarketingOS. Specifically, proof is missing that changes to a user's marketing consent in LifeOS are accurately and consistently propagated to the corresponding user profile within MarketingOS, making the consent status actionable for marketing campaigns.

## 2. Smallest Safe Build Slice to Close It

Implement an event-driven, one-way synchronization mechanism for `User.marketingConsentStatus` updates. This slice focuses on:
1.  Publishing a `userConsentUpdated` event from LifeOS when `User.marketingConsentStatus` changes.
2.  Subscribing to this event and calling the MarketingOS API to update the user's consent status.
This slice will target a specific, limited set of user profiles (e.g., a test cohort) to minimize blast radius.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/userService.js`: Modify `updateUserConsent` method to emit a `userConsentUpdated` event after successful database update.
*   `src/events/userEvents.js`: Define the `userConsentUpdated` event structure (e.g., `{ userId, newConsentStatus, timestamp }`).
*   `src/integrations/marketingOS/marketingOSClient.js`: Add or extend a method `updateUserConsentStatus(userId, consentStatus)` to interact with the MarketingOS API.
*   `src/subscribers/marketingOSConsentSubscriber.js` (new file): Create an event subscriber that listens for `userConsentUpdated` events and calls `marketingOSClient.updateUserConsentStatus`.
*   `src/config/featureFlags.js`: Add a feature flag `marketingOSConsentSyncEnabled` to control the activation of the subscriber.

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `userService.js`: Verify `userConsentUpdated` event is emitted with correct payload.
    *   `marketingOSClient.js`: Verify `updateUserConsentStatus` correctly formats and sends API requests.
    *   `marketingOSConsentSubscriber.js`: Verify subscriber correctly processes events and calls the client.
*   **Integration Tests (Automated):**
    *   Simulate a `User.marketingConsentStatus` change in LifeOS.
    *   Assert that the corresponding user profile in MarketingOS (via MarketingOS API query) reflects the new consent status within 5 minutes.
*   **Observability:**
    *   Monitor logs for `userConsentUpdated` event emissions and `marketingOSClient` API call successes/failures.
    *   Track latency of consent synchronization from LifeOS update to MarketingOS reflection.
*   **Manual Verification:**
    *   Select 100 test users. Manually change their consent status in LifeOS.
    *   Verify the status change in the MarketingOS UI or via direct MarketingOS API query for each user.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If automated integration tests show a failure rate > 1% for consent synchronization within the defined SLA.
*   If manual verification reveals data inconsistencies (e.g., consent status mismatch) for > 2% of the test cohort.
*   If `marketingOSClient` API calls consistently return non-2xx status codes (e.g., 4xx, 5xx) indicating integration issues.
*   If the synchronization process introduces measurable performance degradation (e.g., increased latency, error rates) in either LifeOS `userService` or MarketingOS.
*   If the audit trail for consent changes in either system is incomplete or inaccurate.