# Amendment 41 MarketingOS Proof - G144-100: Marketing Campaign Status & Budget SSOT Integration

This document outlines the proof-closing blueprint note for gap G144-100, ensuring that the `MarketingCampaign` entity's `status` and `budget` fields, as defined in `AMENDMENT_41_MARKETINGOS.md`, are correctly established as the Single Source of Truth (SSOT) within the LifeOS reporting context.

---

### 1. Exact Missing Implementation or Proof Gap

The current LifeOS reporting service for campaign overview (e.g., `CampaignOverviewReportService`) relies on an internal, potentially stale, data store for `MarketingCampaign` `status` and `budget` fields. The gap is the absence of a direct, automated synchronization mechanism to pull these specific fields from the MarketingOS `MarketingCampaign` entity, as designated by `AMENDMENT_41_MARKETINGOS.md` as the SSOT, and update the LifeOS reporting data store. This leads to potential discrepancies between MarketingOS and LifeOS reporting.

### 2. Smallest Safe Build Slice to Close It

Implement a one-way, scheduled synchronization job within LifeOS that periodically fetches the `status` and `budget` for active `MarketingCampaign` entities from the MarketingOS API and updates the corresponding records in the LifeOS reporting database. This slice focuses solely on these two fields for existing campaigns, avoiding broader data model changes or bidirectional sync.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketing/MarketingCampaignSyncService.js`: New service to encapsulate the sync logic (fetching from MarketingOS, mapping, updating LifeOS DB).
*   `src/data/repositories/MarketingCampaignReportingRepository.js`: New or extended repository to handle updates to the LifeOS reporting database for `MarketingCampaign` entities.
*   `src/jobs/syncMarketingCampaignsJob.js`: New scheduled job definition that orchestrates `MarketingCampaignSyncService`.
*   `src/config/jobs.js`: Add configuration entry for `syncMarketingCampaignsJob`.
*   `src/config/marketing.js`: Add MarketingOS API endpoint and authentication details.
*   `src/db/migrations/[timestamp]-add_marketing_campaign_ssot_fields.js`: (Conditional) If the LifeOS reporting DB schema does not already have dedicated fields for `marketing_campaign_status_ssot` and `marketing_campaign_budget_ssot`, a migration to add them.

### 4. Verifier/Runtime Checks

*   **Data Consistency Check:** After each sync job run, query a sample set of `MarketingCampaign` entities (e.g., 10-20 active campaigns) from both MarketingOS API and the LifeOS reporting database. Verify that the `status` and `budget` fields match exactly.
*   **Job Execution Monitoring:** Monitor `syncMarketingCampaignsJob` logs for successful completion, errors, and processing duration.
*   **API Latency Monitoring:** Track response times for calls to the MarketingOS `GET /campaigns/{id}` endpoint made by the sync service.
*   **Error Rate Monitoring:** Monitor the error rate for updates to the LifeOS reporting database by `MarketingCampaignReportingRepository`.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Persistent Data Mismatch:** If the data consistency check (Verifier #1) consistently reports a discrepancy rate greater than 2% across multiple sync cycles for the sampled campaigns.
*   **Job Failure Rate:** If `syncMarketingCampaignsJob` (Verifier #2) fails to complete successfully for 3 consecutive runs or has a failure rate exceeding 10% over a 24-hour period.
*   **MarketingOS API Degradation:** If the average response time for MarketingOS API calls (Verifier #3) exceeds 500ms for more than 1 hour, indicating potential load issues on the SSOT.
*   **LifeOS DB Update Errors:** If the error rate for database updates (Verifier #4) exceeds 5% during a sync cycle, suggesting issues with the LifeOS reporting database or repository logic.
*   **Schema Drift:** If the MarketingOS API response for `MarketingCampaign` entities no longer contains the expected `status` or `budget` fields, or their data types change unexpectedly, preventing successful mapping.