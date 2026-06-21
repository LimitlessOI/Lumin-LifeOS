<!-- SYNOPSIS: AMENDMENT_41_MARKETINGOS: Proof-Closing Blueprint Note (G28-100) -->

# AMENDMENT_41_MARKETINGOS: Proof-Closing Blueprint Note (G28-100)

**Signal:** This document — SSOT foundation.

## 1. Exact Missing Implementation or Proof Gap

The proof gap for G28-100 is the unverified, end-to-end data pipeline for `CampaignEngagement` metrics from the `ExternalAdPlatform` into the `MarketingOS.CampaignMetrics` data store. Specifically, there is no confirmed mechanism to ensure that `CampaignEngagement` data, once ingested, accurately reflects the source data and is consistently available and correctly structured within `MarketingOS` for downstream consumption, establishing it as the Single Source of Truth (SSOT).

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing a dedicated, idempotent data ingestion and transformation service. This service will be responsible for:
1.  Polling or receiving `CampaignEngagement` data from the `ExternalAdPlatform` API.
2.  Validating and transforming the raw data into the `MarketingOS.CampaignMetrics` schema.
3.  Persisting the transformed data into the `MarketingOS.CampaignMetrics` table.
This slice focuses purely on the secure and accurate ingestion and storage of this specific metric, without touching existing reporting or UI components.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/ingestor/campaignEngagementIngestor.js` (New file: Core logic for fetching, transforming, and persisting `CampaignEngagement` data.)
*   `services/marketingos/ingestor/schemas/campaignEngagementSchema.js` (New file: Joi/Zod schema for validating and transforming `ExternalAdPlatform` data to `MarketingOS.CampaignMetrics` format.)
*   `services/marketingos/data/campaignMetricsRepository.js` (Existing file: Add a new method, e.g., `saveCampaignEngagement(data)`, to handle persistence of the transformed data.)
*   `config/marketingos/externalAdPlatform.js` (Existing file: Verify or add necessary API endpoints, authentication tokens, and rate limit configurations for `ExternalAdPlatform`.)
*   `tests/services/marketingos/ingestor/campaignEngagementIngestor.test.js` (New file: Unit and integration tests for the ingestor service.)

## 4. Verifier/Runtime Checks

*   **Unit Tests (`campaignEngagementIngestor.test.js`):**
    *   Mock `ExternalAdPlatform` API responses to verify correct data parsing and transformation according to `campaignEngagementSchema.js`.
    *   Verify that `campaignMetricsRepository.js`'s `saveCampaignEngagement` method is called with the correctly transformed data.
    *   Test edge cases: missing fields, invalid data types, empty responses from `ExternalAdPlatform`.
*   **Integration Tests (`campaignEngagementIngestor.test.js`):**
    *   Run the ingestor against a controlled `ExternalAdPlatform` mock server or a staging `ExternalAdPlatform` instance.
    *   Verify that the `MarketingOS.CampaignMetrics` table contains the expected `CampaignEngagement` records with correct values and timestamps after an ingestion run.
    *   Confirm idempotency: running the ingestor multiple times with the same source data does not create duplicate records or incorrect updates.
*   **Runtime Monitoring:**
    *   Log successful ingestion counts, processing durations, and any data transformation errors.
    *   Implement alerts for ingestion failures, data validation errors, or significant deviations in expected data volume.
    *   Set up a dashboard to visualize `CampaignEngagement` data flow, showing source vs. ingested counts and key metric values.
*   **Data Reconciliation:**