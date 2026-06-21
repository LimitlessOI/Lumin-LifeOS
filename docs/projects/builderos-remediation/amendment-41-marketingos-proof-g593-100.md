<!-- SYNOPSIS: Proof-Closing Blueprint Note: Amendment 41 - MarketingOS SSOT Foundation (G593-100) -->

# Proof-Closing Blueprint Note: Amendment 41 - MarketingOS SSOT Foundation (G593-100)

This document serves as a proof-closing blueprint note for the "SSOT foundation" signal originating from `docs/projects/AMENDMENT_41_MARKETINGOS.md`. The amendment establishes MarketingOS as the Single Source of Truth for `campaign_performance_metrics`. This note outlines the necessary steps to prove this foundation is implemented and operational.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the concrete implementation and verifiable operationalization of MarketingOS as the SSOT for `campaign_performance_metrics`. Specifically, this includes:
*   The data ingestion pipeline for `campaign_performance_metrics` from its designated upstream source.
*   The persistent storage mechanism within MarketingOS that serves as the canonical SSOT for these metrics.
*   The exposure mechanism (e.g., API endpoint, service method) that provides access to these canonical metrics.
*   Automated verification that the ingested and exposed data accurately reflects the source and adheres to SSOT principles (e.g., uniqueness, consistency, freshness).

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice focuses on establishing a minimal, end-to-end verifiable flow for a single `campaign_performance_metric` type (e.g., `impressions`).

1.  **Ingestion Stub:** Implement a basic ingestion mechanism (e.g., a scheduled job or webhook handler) that can receive or pull `impressions` data for a specific campaign ID.
2.  **SSOT Storage:** Persist this `impressions` data into a dedicated, canonical data store (e.g., a `CampaignPerformanceMetrics` table/collection) within MarketingOS, ensuring it's marked as the SSOT.
3.  **Read Endpoint:** Expose a read-only API endpoint or service method (e.g., `/marketingos/campaigns/:campaignId/metrics/impressions`) that retrieves the `impressions` data directly from the SSOT store.
4.  **Basic Verification:** Implement unit and integration tests to confirm data flow from ingestion to storage and then to the read endpoint, asserting data integrity and correctness for the `impressions` metric.

## 3. Exact Safe-Scope Files to Touch First

Based on existing Node/ESM patterns within LifeOS:

*   `src/marketingos/data/campaignPerformanceRepository.js`: Add methods for storing and retrieving `campaign_performance_metrics` (specifically `impressions`) from the SSOT data store.
*   `src/marketingos/services/campaignPerformanceService.js`: Add a service method to orchestrate ingestion and provide access to `campaign_performance_metrics`.
*   `src/marketingos/ingestion/campaignPerformanceIngestor.js`: Implement the logic for ingesting `impressions` data from the upstream source.
*   `src/marketingos/api/routes/campaignPerformanceRoutes.js`: Add a GET route for `/marketingos/campaigns/:campaignId/metrics/impressions`.
*   `src/marketingos/tests/campaignPerformance.test.js`: Add new test cases covering the ingestion, storage, and retrieval of `impressions` data.
*   `src/marketingos/schemas/campaignPerformanceSchema.js`: Define or extend the schema for `campaign_performance_metrics` to include `impressions`.

## 4. Verifier/Runtime Checks

*   **Data Ingestion Log Check:** Monitor logs for `campaignPerformanceIngestor` to confirm successful ingestion events and absence of errors.
*   **SSOT Data Store Query:** Directly query the `CampaignPerformanceMetrics` data store to verify that `impressions` data is present, correctly formatted, and updated according to the ingestion schedule/events.
*   **API Endpoint Validation:** Make HTTP GET requests to `/marketingos/campaigns/:campaignId/metrics/impressions` and assert that the returned data matches the expected canonical values from the SSOT store.
*   **Data Freshness Monitor:** Implement a simple check to ensure the `impressions` data in the SSOT store is updated within the expected SLA (e.g., last updated timestamp).
*   **Consistency Check:** If a legacy source for `impressions` still exists, implement a temporary comparison check to ensure the new SSOT data aligns with the legacy data within an acceptable delta.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Ingestion Failure:** Consistent failure of the `campaignPerformanceIngestor` to process `impressions` data for more than two consecutive cycles.
*   **Data Discrepancy (Critical):** The `impressions` data retrieved from the `/marketingos/campaigns/:campaignId/metrics/impressions` endpoint consistently deviates by more than 5% from the known correct source data for a given campaign.
*   **Data Integrity Violation:** Any detected violation of schema constraints or data type mismatches for `impressions` in the SSOT store.
*   **Performance Degradation:** The read endpoint for `impressions` consistently exceeds a 500ms response time under typical load.
*   **SSOT Inconsistency:** If the temporary consistency check reveals that the new SSOT data for `impressions` is consistently out of sync with the legacy source beyond acceptable thresholds, indicating the SSOT is not yet reliable.