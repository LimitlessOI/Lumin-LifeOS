# Proof-Closing Blueprint Note: Amendment 41 - MarketingOS Proof G567-100

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

This note outlines the necessary steps to close the proof gap for `G567-100`, specifically related to the successful completion of a user's "onboarding survey step 3" and its associated metadata transmission to MarketingOS.

---

### 1. Exact Missing Implementation or Proof Gap

The specific mechanism to capture and transmit `g567-100` proof data from LifeOS to MarketingOS is not yet implemented. This proof specifically relates to the successful completion of a user's "onboarding survey step 3" and its associated metadata (e.g., `surveyId`, `userId`, `completionTimestamp`, `selectedOptions`). The `AMENDMENT_41_MARKETINGOS.md` blueprint specifies that this proof is critical for triggering downstream MarketingOS automation related to user segmentation and personalized follow-up campaigns.

### 2. Smallest Safe Build Slice to Close It

1.  **Introduce `MarketingOSProofService.sendProofG567_100(userId, surveyData)`:** A new method within an existing or new `MarketingOSProofService` to encapsulate the logic for constructing the `g567-100` specific payload and invoking the `MarketingOSIntegrationClient`.
2.  **Integrate into `OnboardingService`:** Add a call to `MarketingOSProofService.sendProofG567_100` within the `OnboardingService` flow, specifically after the successful persistence and validation of "onboarding survey step 3" data. This call should be non-blocking (e.g., asynchronous or fire-and-forget) to avoid impacting core onboarding UX.
3.  **Ensure `MarketingOSIntegrationClient` readiness:** Verify the existing `MarketingOSIntegrationClient` has a generic `sendProof(proofType, payload)` method capable of handling the `g567-100` payload structure as defined in `AMENDMENT_41_MARKETINGOS.md`.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/MarketingOSProofService.js` (Create if not exists, or extend `src/services/MarketingOSService.js`)
*   `src/services/OnboardingService.js` (Modify `completeSurveyStep3` or similar method)
*   `src/clients/MarketingOSIntegrationClient.js` (Verify/extend `sendProof` method signature and implementation)
*   `src/models/UserSurveyData.js` (Ensure relevant data fields are accessible for proof payload construction)
*   `src/tests/services/MarketingOSProofService.test.js` (New unit test file)
*   `src/tests/services/OnboardingService.test.js` (Extend existing integration tests)

### 4. Verifier/Runtime Checks

*   **Unit Tests:** `MarketingOSProofService.test.js` to verify correct `g567-100` payload construction and `MarketingOSIntegrationClient` invocation with expected arguments.
*   **Integration Tests:** `OnboardingService.test.js` to verify that `MarketingOSProofService.sendProofG567_100` is called with the correct `userId` and `surveyData` upon successful completion of "onboarding survey step 3".
*   **E2E Tests (Staging):** Simulate a user completing "onboarding survey step 3" in a staging environment. Verify that a corresponding `g567-100` proof is logged by the `MarketingOSIntegrationClient` and, if possible, received by a mock MarketingOS endpoint or observed in MarketingOS integration logs.
*   **Runtime Monitoring:** Observe `MarketingOSIntegrationClient` logs for successful `g567-100` proof transmissions (HTTP 2xx responses) and monitor for any errors or latency spikes.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If MarketingOS does not receive the `g567-100` proof within 5 seconds of a user completing "onboarding survey step 3" in a staging