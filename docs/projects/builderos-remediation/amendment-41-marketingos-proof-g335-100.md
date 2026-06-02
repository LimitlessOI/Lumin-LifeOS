# Amendment 41: MarketingOS Proof G335-100 - SSOT Foundation Blueprint Note

This document outlines the blueprint for closing the proof gap for G335-100, establishing the Single Source of Truth (SSOT) foundation for `user.marketingOptInStatus` between LifeOS and MarketingOS.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a robust, real-time, and verifiable synchronization mechanism for the `user.marketingOptInStatus` attribute from LifeOS to MarketingOS. This attribute is critical for compliance and targeted marketing, requiring SSOT. The proof gap specifically refers to the absence of automated verification that MarketingOS accurately reflects the LifeOS `user.marketingOptInStatus` for all active users.

## 2. Smallest Safe Build Slice to Close It

Implement a dedicated `MarketingOptInSyncService` responsible for:
1.  Listening to `user.marketingOptInStatus` changes within LifeOS (e.g., via an event bus or database trigger).
2.  Transforming the LifeOS status into the MarketingOS-compatible format.
3.  Calling the MarketingOS User Profile API to update the `marketingOptInStatus` for the specific user.
4.  Logging synchronization attempts and outcomes.
This service will operate asynchronously to minimize impact on LifeOS user flows.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketing/MarketingOptInSyncService.js`: New service to handle the synchronization logic.
*   `src/services/marketing/__tests__/MarketingOptInSyncService.test.js`: Unit tests for the new service.
*   `src/events/userEvents.js`: (If not already present) Define a `USER_MARKETING_OPT_IN_STATUS_UPDATED` event.
*   `src/subscribers/marketingOptInSubscriber.js`: New subscriber to listen for `USER_MARKETING_OPT_IN_STATUS_UPDATED` events and trigger `MarketingOptInSyncService`.
*   `src/config/marketingos.js`: Add MarketingOS API endpoint and authentication configuration.
*   `src/api/marketingos/userProfileApi.js`: (If not already present) A thin wrapper for MarketingOS User Profile API calls.

## 4. Verifier/Runtime Checks

*   **Unit Tests:** `MarketingOptInSyncService.test.js` will verify correct data transformation, API call structure, and error handling.
*   **Integration Tests:** A dedicated integration test suite will simulate a user updating their `marketingOptInStatus` in LifeOS and assert that the corresponding update appears in MarketingOS within a defined SLA (e.g., 5 seconds). This will involve mocking external systems where necessary but verifying the full internal flow.
*   **Monitoring:** Implement Prometheus/Grafana metrics for:
    *   `marketing_opt_in_sync_total_attempts`
    *   `marketing_opt_in_sync_success_total`
    *   `marketing_opt_in_sync_failure_total` (with error types)
    *   `marketing_opt_in_sync_latency_ms`
*   **Data Reconciliation Job:** A daily batch job to compare `user.marketingOptInStatus` for a random sample of 1% of active users directly from LifeOS DB and MarketingOS API. Report discrepancies.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **High Error Rate:** If `marketing_opt_in_sync_failure_total` exceeds 0.5% of `marketing_opt_in_sync_total_attempts` over a 1-hour window.
*   **Latency Breach:** If `marketing_opt_in_sync_latency_ms` 99th percentile exceeds 10 seconds for 15 consecutive minutes.
*   **Discrepancy Threshold:** If the daily data reconciliation job reports more than 0.1% discrepancies in `user.marketingOptInStatus` for the sampled users.
*   **MarketingOS Feedback:** Direct reports from the MarketingOS team indicating incorrect or stale `marketingOptInStatus` data for specific users or segments.
*   **Compliance Risk:** Any indication that the synchronization failure could lead to non-compliance with privacy regulations (e.g., sending marketing emails to opted-out users).