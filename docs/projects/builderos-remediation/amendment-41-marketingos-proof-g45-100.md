# Amendment 41 MarketingOS Proof Gap G45-100 Remediation Blueprint

This document outlines the plan to close the identified proof gap G45-100 related to Amendment 41's integration with MarketingOS, ensuring SSOT foundation.

## 1. Exact Missing Implementation or Proof Gap

The current implementation of Amendment 41 for MarketingOS lacks a robust, verifiable mechanism for propagating user email opt-in/opt-out status changes from LifeOS's `UserPreferences` service to the MarketingOS `ContactManagement` service. Specifically, while the data model exists, the event-driven synchronization and its end-to-end verification are not fully established or proven. This gap means that MarketingOS may not always reflect the most current user consent status, leading to potential compliance issues.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Implementing an event listener in the MarketingOS integration layer for `UserPreferenceUpdated` events originating from LifeOS.
*   Parsing the event payload to extract the `emailOptInStatus` for the relevant `userId`.
*   Updating the corresponding contact record in MarketingOS via its `ContactManagement` API.
*   Adding a new integration test suite to verify this end-to-end flow.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos-integration/src/events/user-preference-listener.js` (new file or extend existing event handler)
*   `services/marketingos-integration/src/api/contact-management.js` (extend existing API client if needed, or ensure method exists)
*   `services/marketingos-integration/tests/integration/user-preference-sync.test.js` (new test file)
*   `services/marketingos-integration/package.json` (add any new dependencies for event processing or testing)

## 4. Verifier/Runtime Checks

*   **Unit Tests:** Ensure `user-preference-listener.js` correctly parses events and calls the `contact-management.js` update method with the correct payload.
*   **Integration Tests:**
    *   Simulate a `UserPreferenceUpdated` event from LifeOS with a changed `emailOptInStatus`.
    *   Verify that the MarketingOS `ContactManagement` service (mocked or test instance) receives the update with the correct `userId` and `emailOptInStatus`.
    *   Verify that querying MarketingOS for the user's contact record reflects the updated status.
*   **Runtime Monitoring:**
    *   Monitor `UserPreferenceUpdated` event consumption rates in the MarketingOS integration service.
    *   Monitor API call success rates to MarketingOS `ContactManagement` service.
    *   Implement logging for successful and failed preference synchronizations.
    *   Set up alerts for prolonged periods of failed synchronizations or event processing backlogs.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If integration tests consistently fail to reflect the updated status in MarketingOS after event emission.
*   If runtime monitoring shows a significant discrepancy (e.g., >1% error rate or >5-minute delay) between LifeOS preference updates and Marketing