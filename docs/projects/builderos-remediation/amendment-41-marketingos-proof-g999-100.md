<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G999 100. -->

Amendment 41: MarketingOS Proof - G999-100 - User Engagement Score Sync
This document serves as a proof-closing blueprint note for Amendment 41, focusing on the `userEngagementScore` synchronization from LifeOS to MarketingOS.

1.  **Exact Missing Implementation or Proof Gap**
    The `userEngagementScore` metric, as defined in Amendment 41, requires a robust, real-time synchronization mechanism from the LifeOS `UserActivityService` to the MarketingOS `CustomerProfileService`. The current gap is the lack of a verified, end-to-end data pipeline ensuring that `userEngagementScore` updates are consistently and accurately reflected in MarketingOS within the defined SLA (e.g., 5-minute latency). Specifically, the proof for idempotent updates and comprehensive error handling for transient network failures is incomplete.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves enhancing the existing `MarketingOSIntegrationService` within LifeOS to include a dedicated `syncUserEngagementScore` method. This method will leverage the `UserActivityService` to fetch the latest scores and push them to MarketingOS via its `PATCH /customer-profiles/{userId}/engagement` endpoint. The slice focuses on the data transformation, API call, and local retry logic, ensuring that only the `userEngagementScore` field is updated.

3.  **Exact Safe-Scope Files to Touch First**
    *   `services/MarketingOSIntegrationService.js`: Implement or extend the `syncUserEngagementScore` method.
    *   `services/UserActivityService.js`: Ensure `getUserEngagementScore(userId)` is exposed and performant for integration.
    *   `config/marketingos.js`: Verify MarketingOS API endpoint and authentication details are correctly configured.
    *   `interfaces/marketingos/CustomerProfileDTO.js`: Confirm `userEngagementScore` field definition aligns with MarketingOS expectations.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** `MarketingOSIntegrationService.test.js` for `syncUserEngagementScore` method, covering success, failure, and retry scenarios.
    *   **Integration Tests:** Simulate a `userEngagementScore` update in LifeOS for a test user and verify its appearance in MarketingOS via a direct API query to MarketingOS `GET /customer-profiles/{userId}`.
    *   **Monitoring:** Observe `marketingos_sync_engagement_score_success_total` and `marketingos_sync_engagement_score_failure_total` metrics in LifeOS.
    *   **Log Analysis:** Check for `[MarketingOSIntegrationService]` logs indicating successful syncs or specific error codes.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `userEngagementScore` discrepancies between LifeOS and MarketingOS exceed 0.1% of synchronized profiles over a 24-hour period.
    *   If the average latency for `userEngagementScore` synchronization exceeds 10 minutes for more than 1% of updates.
    *   If `marketingos_sync_engagement_score_failure_total` rate exceeds 0.5% of attempts.
    *   If the MarketingOS `PATCH /customer-profiles/{userId}/engagement` endpoint reports consistent 5xx errors not handled by retry logic.
    *   If the deployment causes any measurable degradation in `UserActivityService` performance (e.g., p99 latency increase > 5%).