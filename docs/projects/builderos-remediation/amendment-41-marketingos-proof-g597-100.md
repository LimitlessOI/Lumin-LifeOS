# Proof-Closing Blueprint Note: Amendment 41 MarketingOS Proof G597-100

This document serves as a proof-closing blueprint note for the `g597-100` gap identified within Amendment 41, which establishes MarketingOS as the Single Source of Truth (SSOT) foundation for specific marketing campaign metadata.

---

## 1. Exact Missing Implementation or Proof Gap

The exact missing implementation or proof gap for `g597-100` is the finalization and verification of the `MarketingCampaignSSOTSyncService`'s ability to accurately ingest, transform, and persist `campaignStatus` updates from MarketingOS into the LifeOS `MarketingCampaign` data model. This specifically addresses the real-time or near real-time synchronization of campaign lifecycle states, ensuring LifeOS reflects the authoritative status from MarketingOS as per Amendment 41's SSOT mandate. The current gap is the robust handling of edge cases in status transitions and the comprehensive logging/alerting for discrepancies.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice to close this gap involves:
*   Refining the `campaignStatus` field mapping and transformation logic within the `MarketingCampaignSSOTSyncService`.
*   Implementing idempotent update mechanisms for `campaignStatus` to prevent race conditions or stale data.
*   Adding comprehensive logging for `campaignStatus` changes, including source, previous value, and new value.
*   Developing specific unit and integration tests targeting various `campaignStatus` transition scenarios and error conditions.
*   Integrating a basic discrepancy detection and alerting mechanism for `campaignStatus` mismatches.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketing/MarketingCampaignSSOTSyncService.js` (Refine `syncCampaignStatus` method, add logging)
*   `src/models/MarketingCampaign.js` (Ensure `campaignStatus` field definition is robust and indexed if necessary)
*   `src/tests/services/marketing/MarketingCampaignSSOTSyncService.test.js` (Add new test cases for `campaignStatus` transitions and error handling)
*   `src/config/marketing.js` (Potentially add configuration for `campaignStatus` mapping rules or alerting thresholds)
*   `src/utils/logger.js` (Ensure appropriate logging levels and context are available for the service)

## 4. Verifier/Runtime Checks

*   **Unit Tests:** Execute `MarketingCampaignSSOTSyncService.test.js` to confirm `campaignStatus` transformation, persistence, and idempotency logic.
*   **Integration Tests:** Deploy the service to a staging environment. Trigger simulated MarketingOS `campaignStatus` updates (via mock webhooks or direct API calls) for a diverse set of campaigns, including active, paused, completed, and archived states. Verify the `campaignStatus` in the LifeOS database matches the MarketingOS source within expected latency.
*   **Runtime Monitoring:** Monitor `MarketingCampaignSSOTSyncService` logs for `INFO` level messages indicating successful `campaignStatus`