### MarketingOS Proof G155-100: SSOT Foundation for Customer Segments

This blueprint note addresses the proof gap for MarketingOS's adherence to the Single Source of Truth (SSOT) principle for customer segment data, as foundational to AMENDMENT_41_MARKETINGOS.

1.  **Exact missing implementation or proof gap:**
    MarketingOS lacks a robust, verifiable mechanism to guarantee its internal customer segment data is a real-time, SSOT-compliant reflection of the `CustomerProfileService`'s segment definitions. Specifically, there is no explicit, event-driven synchronization or a scheduled reconciliation process with verifiable data integrity checks. This creates a potential for stale or inconsistent segment targeting.

2.  **Smallest safe build slice to close it:**
    Implement an event-driven synchronization service within MarketingOS that subscribes to `CustomerProfileService`'s segment update events (e.g., via webhooks or a message queue). This service will be responsible for receiving segment changes (create, update, delete) and applying them to MarketingOS's internal customer segment store. This slice focuses solely on inbound segment data consistency.

3.  **Exact safe-scope files to touch first:**
    *   `services/marketingos/src/customerSegmentSyncService.js` (New: Core logic for processing segment events and updating local store)
    *   `services/marketingos/src/api/webhooks/customerProfileWebhookController.js` (New/Extend: Endpoint to receive `CustomerProfileService` segment update webhooks)
    *   `services/marketingos/src/data/customerSegmentRepository.js` (Extend: Add/modify methods for atomic upsert and deletion of segments based on external ID)
    *   `services/marketingos/src/app.js` (Extend: Register `customerProfileWebhookController` and initialize `customerSegmentSyncService`)
    *   `services/marketingos/package.json` (Extend: Add any new messaging/webhook client dependencies if required)
    *   `services/marketingos/src/config/env.js` (Extend: Add environment variables for webhook secret, `CustomerProfileService` endpoint, etc.)

4.  **Verifier/runtime checks:**
    *   **Unit Tests:** Verify `customerSegmentSyncService` correctly parses various segment event payloads and calls the repository with expected data.
    *   **Integration Tests:** Simulate `CustomerProfileService` sending a segment `CREATED`, `UPDATED`, and `DELETED` event to the webhook endpoint and assert MarketingOS's `customerSegmentRepository` state reflects these changes accurately.
    *   **E2E Tests:** Provision a new segment in `CustomerProfileService` via its API, then query MarketingOS's internal segment API to confirm its presence and data integrity within a defined latency. Repeat for updates and deletions.
    *   **Runtime Monitoring:**
        *   Monitor webhook endpoint success rates and latency.
        *   Log `customerSegmentSyncService` processing events (success, failure, latency).
        *   Implement metrics for `customerSegmentRepository` update operations (count, latency).
        *   Periodically (e.g., daily) run a reconciliation job that compares a sample of MarketingOS segments against `CustomerProfileService` via direct API calls, logging any discrepancies.

5.  **Stop conditions if runtime truth disagrees:**
    *   If the webhook endpoint's error rate exceeds 1% over a 15-minute window.
    *   If `customerSegmentSyncService` reports a processing backlog exceeding 100 events or a processing latency for critical segments exceeding 5 minutes.
    *   If the daily reconciliation job identifies more than 0.05% of active segments with data discrepancies between MarketingOS and `CustomerProfileService`.
    *   If MarketingOS campaigns are observed targeting incorrect customer populations due to stale segment data, directly attributable to sync failures.
    *   If `CustomerProfileService` confirms a segment update was sent, but MarketingOS's internal state does not reflect it within the agreed-upon SLA (e.g., 10 minutes).