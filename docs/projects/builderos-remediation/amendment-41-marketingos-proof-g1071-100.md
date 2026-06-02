AMENDMENT 41 MARKETINGOS PROOF - G1071-100: SSOT Foundation for Customer Profile Marketing Attributes
This blueprint note addresses the critical proof gap for Amendment 41, ensuring the Single Source of Truth (SSOT) foundation for MarketingOS-driven `CustomerProfile` attributes.
1.  Exact missing implementation or proof gap:
    The current implementation lacks a dedicated, automated integration test to verify that `CustomerProfile` marketing-specific attributes (e.g., `marketingOptInStatus`, `campaignEngagementHistory`) originating from MarketingOS are consistently established and maintained as the SSOT within LifeOS's `CustomerProfileService`. This gap means the SSOT claim for these attributes is not programmatically proven.
2.  Smallest safe build slice to close it:
    Implement a new integration test suite (`customerProfileSSOT.test.js`) that simulates MarketingOS pushing updates for key marketing attributes to a `CustomerProfile`. This suite will then assert that `CustomerProfileService` correctly reflects these updates, persists them, and, if applicable, internally records MarketingOS as the authoritative source for those specific fields. This slice focuses purely on verification and does not introduce new business logic.
3.  Exact safe-scope files to touch first:
-   `tests/integration/marketingos/customerProfileSSOT.test.js` (new file)
-   `services/customer/CustomerProfileService.js` (for review of existing update paths and potential minor logging/assertion points if source tracking is not explicit)
-   `modules/marketingos/syncService.js` (for review of how MarketingOS data is currently ingested and mapped to `CustomerProfile`)
4.  Verifier/runtime checks:
-   Execute the new test suite: `npm test tests/integration/marketingos/customerProfileSSOT.test.js`.
-   Verify all tests pass, specifically asserting:
-   A `CustomerProfile` created or updated via MarketingOS integration has its designated marketing attributes correctly set and persisted.
-   Subsequent updates to these marketing attributes from MarketingOS are correctly applied and override any conflicting updates from other (non-SSOT) internal LifeOS