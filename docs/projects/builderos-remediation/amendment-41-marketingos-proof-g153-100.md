Proof-Closing Blueprint Note: MarketingOS Integration (g153-100)
Source Blueprint: `docs/projects/AMENDMENT_41_MARKETINGOS.md`
Signal: This document — SSOT foundation.
---
1. Exact Missing Implementation or Proof Gap
The current gap `g153-100` is the lack of automated, end-to-end verification that a user's `subscriptionTier` change within LifeOS is accurately and promptly reflected in the MarketingOS `customerProfile` service. Specifically, when a LifeOS user transitions to `PREMIUM` tier, MarketingOS `customerProfile.tier` must update to `premium` within 30 seconds. The existing implementation relies on event-driven synchronization, but a dedicated proof point for this specific data flow is absent.
2. Smallest Safe Build Slice to Close It
Implement a new integration test suite focused solely on validating the `subscriptionTier` synchronization from LifeOS to MarketingOS. This slice will:
-   Simulate a `subscriptionTier` update for a test user in LifeOS.
-   Poll the MarketingOS `customerProfile` API for that user.
-   Assert the correct `tier` value within a defined timeout.
This build slice introduces no new production code, only verification logic within the test environment.
3. Exact Safe-Scope Files to Touch First
-   `tests/integration/marketingos-subscription-sync.test.js` (New file)
-   `package.json` (Potentially update `scripts` for new test runner command, or add new test dependencies if required, e.g., a polling utility)
-   `config/test.js` (If MarketingOS apiEP or credentials need specific configuration for the test environment)
4. Verifier/Runtime Checks
1.  Execute Test: Run `npm test -- tests/integration/marketingos-subscription-sync.test.js`.
2.  Assertion Check: Verify the test passes, confirming `MarketingOS.getCustomerProfile(userId).tier === 'premium'` within the specified timeout.
3.  LifeOS Event Logs: Monitor LifeOS event bus logs for `UserSubscriptionTierUpdated` events corresponding to the test user.
4.  MarketingOS API Logs: Monitor MarketingOS API ingress logs for `customerProfile` update requests containing the `tier: 'premium'` payload for the test user.
5.  Latency Check: Ensure the total time from LifeOS update to MarketingOS reflection is consistently below 30 seconds.
5. Stop Conditions If Runtime Truth Disagrees
-   Test Failure: The `marketingos-subscription-sync.test.js` consistently fails to assert the correct `tier` in MarketingOS.
-   Missing Events: LifeOS event logs do not show `UserSubscriptionTierUpdated` events for the simulated change.
-   Missing MarketingOS Updates: MarketingOS API logs show no incoming `customerProfile` update requests, or show requests with incorrect data/errors, for the test user.
-   Excessive Latency: The observed synchronization time consistently exceeds 30 seconds, indicating a performance bottleneck.
-   Data Inconsistency: Manual inspection of MarketingOS for the test user shows an incorrect `tier` value even after the test run.