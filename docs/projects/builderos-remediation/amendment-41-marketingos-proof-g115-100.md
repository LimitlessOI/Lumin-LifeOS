<!-- SYNOPSIS: Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - SSOT Foundation (G115-100) -->

# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - SSOT Foundation (G115-100)

This document serves as a proof-closing blueprint note for Amendment 41, specifically addressing the "Single Source of Truth" (SSOT) foundation for MarketingOS.

---

## 1. Exact Missing Implementation or Proof Gap

The core gap is the lack of a concrete, verifiable, and automated mechanism to assert and maintain the "Single Source of Truth" (SSOT) status for `MarketingCampaign` entities within MarketingOS. While Amendment 41 outlines the *goal* of MarketingOS consuming SSOT data from core services (e.g., `CampaignService`, `ProductCatalogService`), it lacks the explicit implementation and runtime proof that this SSOT status is consistently achieved and verifiable. Specifically, there is no automated process to detect and report deviations from the intended SSOT for key `MarketingCampaign` attributes.

## 2. Smallest Safe Build Slice to Close It

Implement a lightweight, scheduled data consistency verification and reporting mechanism for `MarketingCampaign` entities. This slice focuses on passive verification and reporting, without introducing automatic remediation, to ensure safe scope.

**Key components:**
*   **Model Extension:** Add `last_ssot_verified_at` (timestamp) and `ssot_source_id` (string, e.g., 'CampaignService', 'ProductCatalogService') fields to the `MarketingCampaign` data model.
*   **Verification Service Method:** A new method within `MarketingCampaignService` to fetch a `MarketingCampaign` entity, query its corresponding SSOT source(s) (e.g., `CampaignService` for campaign details, `ProductCatalogService` for associated product data), compare key attributes, and return a discrepancy report.
*   **Scheduled Job:** A new BuilderOS-governed cron job that periodically iterates through `MarketingCampaign` entities, invokes the verification service method, updates `last_ssot_verified_at`, and logs any identified discrepancies to a BuilderOS-internal audit log.

## 3. Exact Safe-Scope Files to Touch First

*   `src/models/MarketingCampaign.js`: Add `last_ssot_verified_at` and `ssot_source_id` fields to the schema.
*   `src/services/marketing/MarketingCampaignService.js`: Add a new method, e.g., `verifySsotConsistency(campaignId)`, which orchestrates fetching data from external SSOT sources and comparing it.
*   `src/jobs/marketing/verifyMarketingCampaignSsotJob.js`: New file for the scheduled job that calls `MarketingCampaignService.verifySsotConsistency`.
*   `src/config/jobs.js`: Register `verifyMarketingCampaignSsotJob` with its schedule.
*   `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g115-100.md`: This document itself.

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `MarketingCampaignService.test.js`: Test `verifySsotConsistency` method with mocked external service responses, ensuring it correctly identifies and reports discrepancies and updates `last_ssot_verified_at`.
    *   `verifyMarketingCampaignSsotJob.test.js`: Test the job's execution flow, ensuring it calls the service method and handles results.
*   **Integration Tests:**
    *   Run the `verifyMarketingCampaignSsotJob` in a staging environment with controlled test data. Verify that `last_ssot_verified_at` timestamps are updated in the database.
    *   Introduce intentional discrepancies in mocked SSOT sources and confirm they are logged by the job.
*   **Runtime Monitoring:**
    *   Monitor BuilderOS internal logs for `verifyMarketingCampaignSsotJob` execution status (success/failure) and reported discrepancies.