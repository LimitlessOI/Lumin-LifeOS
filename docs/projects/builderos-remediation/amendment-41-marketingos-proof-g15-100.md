Proof-Closing Blueprint Note: Amendment 41 MarketingOS Integration - Proof G15-100
Source Blueprint: `docs/projects/AMENDMENT_41_MARKETINGOS.md`
Signal: This document — SSOT foundation.
---
1.  **Exact Missing Implementation or Proof Gap**
    The initial proof of concept for the `UserSegmentSync` service to MarketingOS lacks robust error handling, idempotency for segment updates, and comprehensive logging for auditability. Specifically, the current implementation does not guarantee eventual consistency in the face of transient network failures or MarketingOS API rate limits, leading to potential data drift for user segments. The current implementation also does not fully leverage BuilderOS's internal event bus for segment change notifications, relying instead on periodic polling which introduces latency and potential race conditions.

2.  **Smallest Safe Build Slice to Close It**
    Implement a retry mechanism with exponential backoff for MarketingOS API calls within `apiClient.js`. Introduce a persistent, ordered queue (`segmentUpdateQueue`) for segment updates to ensure idempotency and reliable processing, triggered by BuilderOS internal `UserSegmentChanged` events. Enhance `UserSegmentSyncService` to consume from this queue and process updates, adding comprehensive logging to capture all sync attempts, successes, and failures with relevant payload identifiers and correlation IDs.

3.  **Exact Safe-Scope Files to Touch First**
    *   `services/builder-os/src/marketingos/UserSegmentSyncService.js`
    *   `services/builder-os/src/marketingos/apiClient.js`
    *   `services/builder-os/src/queues/segmentUpdateQueue.js`
    *   `services/builder-os/src/events/UserSegmentChangedEvent.js` (if not existing, define event structure)
    *   `services/builder-os/src/listeners/UserSegmentChangeListener.js` (to push events to queue)
    *   `tests/services/builder-os/src/marketingos/UserSegmentSyncService.test.js`
    *   `tests/services/builder-os/src/queues/segmentUpdateQueue.test.js`

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** Verify retry logic in `apiClient.js`, queue processing in `segmentUpdateQueue.js`, and error handling within `UserSegmentSyncService.test.js`.
    *   **Integration Tests:** Simulate MarketingOS API failures (e.g., 5xx errors, rate limits) and verify that segments are eventually synchronized correctly. Verify that `UserSegmentChanged` events correctly trigger queueing and processing.
    *   **Monitoring:** Observe `UserSegmentSyncService` logs for `sync_success`, `sync_failure`, `retry_attempt` events. Monitor `segmentUpdateQueue` depth and processing rates.
    *   **Data Consistency Check:** Periodically compare a sample of BuilderOS user segments with their representation in MarketingOS to detect drift, ensuring consistency within a defined SLA (e.g., 5 minutes).

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   Persistent `sync_failure` rates exceeding 5% for more than 30 minutes, indicating a systemic issue not covered by retries.
    *   `segmentUpdateQueue` backlog growing continuously without processing, suggesting a consumer failure or resource exhaustion.
    *   Discrepancies in data consistency checks (e.g., >1% segment mismatch) that cannot be attributed to expected propagation delays.
    *   Introduction of new `ERR_UNKNOWN_FILE_EXTENSION` or similar Node.js runtime errors during deployment or execution of the BuilderOS service, indicating a build or environment misconfiguration.