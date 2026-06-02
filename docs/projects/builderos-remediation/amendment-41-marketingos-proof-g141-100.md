# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G141-100

This document serves as the SSOT foundation for closing proof gap G141-100 related to AMENDMENT_41_MARKETINGOS.

## 1. Exact Missing Implementation or Proof Gap

The exact missing implementation or proof gap is the *verified, end-to-end propagation and synchronization of user consent status (specifically, for targeted marketing communications) from LifeOS to MarketingOS*. Proof G141-100 specifically targets the assurance that a user's opt-out status in LifeOS is accurately and promptly reflected in MarketingOS, preventing unauthorized targeted communications. The current state lacks a robust, auditable mechanism to confirm this synchronization post-initial integration.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **Enhancing the `ConsentService`:** Introduce a new method or extend an existing one to explicitly trigger a MarketingOS update when a user's relevant consent status changes.
2.  **Developing/Extending `MarketingOSAdapter`:** Implement a dedicated function within the adapter to securely transmit the user ID and their updated consent status to the designated MarketingOS API endpoint. This should handle retries and error logging.
3.  **Implementing a Verification Endpoint (Internal):** Create a BuilderOS-only internal endpoint or a scheduled job that can query both LifeOS and MarketingOS for a sample set of user consent statuses and report discrepancies. This is for proof, not production user features.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/consentService.js` (LifeOS core service for managing consent)
*   `src/integrations/marketingOSAdapter.js` (LifeOS integration layer for MarketingOS APIs)
*   `src/models/userConsent.js` (Potentially add a `lastMarketingOSSyncAt` timestamp or similar for auditing)
*   `src/builderos/proofs/g141-100Verifier.js` (New file for the internal verification logic)
*   `src/builderos/routes/proofs.js` (Add a route for the verifier endpoint, if applicable)

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `consentService.js`: Verify that calling `updateUserConsent` correctly triggers the `marketingOSAdapter` method when relevant consent types change.
    *   `marketingOSAdapter.js`: Verify successful API call construction and error handling for consent updates (mocking MarketingOS API responses).
*   **Integration Tests (BuilderOS-only):**
    *   Simulate a user opting out in LifeOS.
    *   Execute the `g141-100Verifier.js` logic to confirm the opt-out status is reflected in MarketingOS within a defined SLA (e.g., 5 minutes).
*   **Runtime Monitoring:**
    *   Monitor success rates and latency of API calls from `marketingOSAdapter` to MarketingOS.
    *   Log specific events for consent synchronization attempts and outcomes.
    *   BuilderOS internal dashboard showing the synchronization status and any detected discrepancies from `g141-100Verifier.js` runs.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Discrepancy Threshold Exceeded:** If the `g141-100Verifier.js` reports more than 0.1% (or 1 in 1000) of sampled users having mismatched consent status between LifeOS and MarketingOS for targeted communications.
*   **API Failure Rate:** If the `marketingOSAdapter` reports a sustained API call failure rate to MarketingOS exceeding 1% for consent updates over a 1-hour period.
*   **Synchronization Latency:** If the average time for a consent update to propagate from LifeOS to MarketingOS (as measured by the verifier) consistently exceeds 10 minutes.
*   **User Reports:** Direct user feedback or support tickets indicating they are receiving targeted marketing communications despite opting out in LifeOS.