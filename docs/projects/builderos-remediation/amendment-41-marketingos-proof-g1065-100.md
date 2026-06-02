Amendment 41: MarketingOS Proof G1065-100 - Proof-Closing Blueprint Note
This document outlines the necessary steps to close the proof gap for MarketingOS integration point G1065-100, ensuring the SSOT foundation is robust.
1. Exact Missing Implementation or Proof Gap
The current implementation ensures that user profile updates, specifically consent changes related to segment G1065-100, are emitted from LifeOS. The proof gap lies in the end-to-end verification that these specific consent changes are accurately received, processed, and reflected as actionable data within MarketingOS, specifically for segment G1065-100, and that MarketingOS's internal state correctly reflects the LifeOS SSOT.
2. Smallest Safe Build Slice to Close It
Implement a dedicated integration test suite that simulates a user consent change in LifeOS for segment G1065-100, then programmatically queries the MarketingOS API to confirm the updated consent status for that specific user and segment. This slice focuses purely on verification without altering core LifeOS or MarketingOS business logic.
3. Exact Safe-Scope Files to Touch First
-   `tests/integration/marketingos/consentSyncG1065.test.js`: New file for the integration test suite.
-   `src/services/marketingos/apiClient.js`: Extend existing client (if present) or create a minimal client to query MarketingOS for user consent status.
-   `src/events/userConsentChanged.js`: Verify the event payload for G1065-100 consent changes includes necessary identifiers for MarketingOS lookup. (Read-only verification, no modification unless critical data is missing).
4. Verifier/Runtime Checks
-   Automated Integration Tests: The `consentSyncG1065.test.js` suite must pass consistently in CI/CD.
-   MarketingOS API Response: For a simulated test user, the MarketingOS API response for consent status related to G1065-100 must precisely match the state set in LifeOS.
-   Event Monitoring: Monitoring dashboards for `userConsentChanged` events should show successful processing by the MarketingOS integration service, with no errors or significant delays for events tagged with G1065-100.
-   Manual Spot Check (Initial Deployment): Verify a small sample of test users directly within the MarketingOS UI to confirm their G1065-100 segment consent status aligns with LifeOS.
5. Stop Conditions If Runtime Truth Disagrees
-   Integration Test Failures: Any failure in `consentSyncG1065.test.js` immediately halts the build and requires investigation.
-   MarketingOS API Discrepancy: If the MarketingOS API returns an incorrect consent status for the test user/segment, the proof is not closed.
-   Event Processing Errors/Delays: Persistent errors or delays exceeding defined thresholds for `userConsentChanged` events related to G1065-100 indicate a breakdown in the data flow.
-   Manual UI Discrepancies: If manual verification in the MarketingOS UI reveals discrepancies for G1065-100 consent, the proof is not closed.