The specification is contradictory: it asks to write a `.md` file but then asks to "Generate the complete implementation code." The provided `.md` content is a blueprint, not executable code.
---
Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G9-100
Signal: This document — SSOT foundation.
This blueprint note addresses and closes proof point G9-100, focusing on the foundational synchronization of core customer profile data from LifeOS to MarketingOS to establish a Single Source of Truth (SSOT) for customer profiles.
---
1. Exact Missing Implementation or Proof Gap
The gap is the verified, real-time synchronization of critical customer profile updates from LifeOS to MarketingOS, specifically ensuring that `customer.profile.email` and `customer.profile.status` changes in LifeOS are accurately and promptly propagated to and reflected in MarketingOS. Proof G9-100 confirms that MarketingOS consistently reflects LifeOS as the SSOT for these core customer attributes within defined latency and accuracy SLAs.
2. Smallest Safe Build Slice to Close It
Implement an event-driven mechanism within the existing `marketingos-integration` service to subscribe to `customer.profile.updated` events from the LifeOS event bus. This mechanism will parse the event payload, extract the `customerId`, `email`, and `status` fields, and then call the appropriate MarketingOS apiEP to update the corresponding customer record. This slice focuses solely on the `email` and `status` fields for existing customer profiles.
3. Exact Safe-Scope Files to Touch First
-   `services/marketingos-integration/src/events/customerProfileUpdatedHandler.js` (New file: Event handler logic)
-   `services/marketingos-integration/src/index.js` (Modify: Register `customerProfileUpdatedHandler` with the event bus listener)
-   `services/marketingos-integration/src/api/marketingosClient.js` (Modify/Extend: Add `updateCustomerProfile` method if not present, or ensure it supports `email` and `status` updates)
-   `services/marketingos-integration/package.json` (Modify: Add any new event bus client or API client dependencies if required)
-   `services/marketingos-integration/test/unit/customerProfileUpdatedHandler.test.js` (New file: Unit tests for the handler)
-   `services/marketingos-integration/test/integration/customerProfileSync.test.js` (New file: Integration tests simulating event and verifying MarketingOS update)
4. Verifier/Runtime Checks
-   Unit Tests: Verify `customerProfileUpdatedHandler.js` correctly parses `customer.profile.updated` event payloads and invokes `marketingosClient.updateCustomerProfile` with the extracted `customerId`, `email`, and `status`.
-   Integration Tests: Simulate a `customer.profile.updated` event being published by LifeOS. Assert that the `marketingos-integration` service processes it, and subsequently, a query to the MarketingOS API for that customer's profile returns the updated `email` and `status`.
-   Observability: Monitor `marketingos-integration` service logs for `customerProfileUpdatedHandler` execution, success/failure rates, and latency. Establish metrics for `marketingos_profile_update_success_total` and `marketingos_profile_update_failure_total`.
-   Manual Verification (Staging/Production): Update the email and status for a known test customer in LifeOS. Within 30 seconds, verify the change is reflected in the MarketingOS UI and via a direct MarketingOS API query for that customer.
5. Stop Conditions if Runtime Truth Disagrees
-   If the `marketingos_profile_update_failure_total` metric shows a sustained error rate exceeding 0.1% over a 5-minute window.
-   If the end-to-end latency for profile updates (LifeOS change to MarketingOS reflection) consistently exceeds 60 seconds for more than 1% of updates.
-   If manual verification or automated integration tests reveal `customer.profile.email` or `customer.profile.status` in MarketingOS diverging from LifeOS for more than 0.5% of active customer profiles.
-   If the MarketingOS API rateLimits are consistently hit by the `marketingos-integration` service, indicating a need for re-evaluation of the update strategy