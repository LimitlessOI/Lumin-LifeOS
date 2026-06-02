# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G131-100

This document serves as a proof-closing blueprint note for the "SSOT foundation" signal related to `AMENDMENT_41_MARKETINGOS.md`, specifically addressing proof gap G131-100.

## 1. Exact Missing Implementation or Proof Gap

The current implementation of `AMENDMENT_41_MARKETINGOS` establishes the foundational data flow for "Campaign Performance Metrics" as a Single Source of Truth (SSOT). However, there is a missing automated, runtime verification mechanism to continuously confirm that the data consumed by MarketingOS from its designated SSOT source (e.g., LifeOS Analytics) remains consistent, accurate, and fresh according to the amendment's specifications. Specifically, there is no dedicated, scheduled job to actively compare a representative sample of these metrics between MarketingOS and the SSOT source.

## 2. Smallest Safe Build Slice to Close It

Implement a new, lightweight, scheduled background job within the `marketingos-sync` service. This job will:
1.  Periodically fetch a small, fixed sample of active "Campaign Performance Metrics" from the MarketingOS API.
2.  Concurrently fetch the corresponding metrics for the same campaigns directly from the LifeOS Analytics SSOT source.
3.  Perform a direct comparison of key metrics and timestamps.
4.  Log any detected discrepancies to BuilderOS internal logs.
This slice focuses solely on verification and logging, without modifying existing data flows or customer-facing features.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos-sync/src/jobs/verifyCampaignMetrics.js` (New file: Contains the logic for fetching, comparing, and logging metrics.)
*   `services/marketingos-sync/src/config/job-schedules.js` (Modify: Add a new entry to schedule `verifyCampaignMetrics.js`.)
*   `services/marketingos-sync/src/utils/marketingosApi.js` (Modify: Add a new function `getSampleCampaignMetrics(campaignIds)` to query MarketingOS.)
*   `services/analytics/src/data/campaignMetricsRepository.js` (Modify: Add a new function `getSampleCampaignMetricsFromSSOT(campaignIds)` to query the SSOT source.)
*   `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g131-100.md` (This document.)

## 4. Verifier/Runtime Checks

The `verifyCampaignMetrics.js` job will execute the following checks:

*   **Data Freshness:** For each sampled campaign, verify that the `lastUpdatedTimestamp` reported by MarketingOS is within a defined delta (e.g., 15 minutes) of the `lastUpdatedTimestamp` from the SSOT source.
*   **Key Metric Consistency:** For each sampled campaign, verify that core metrics (e.g., `impressions`, `clicks`, `conversions`, `spend`) from MarketingOS match the SSOT source within a defined tolerance (e.g., 0% for counts, 0.01% for rates).
*   **Existence Check:** Ensure that all sampled campaigns retrieved from the SSOT source are also present and retrievable from MarketingOS.
*   **Logging:** Each run will log a summary of its findings (total campaigns checked, number of discrepancies, type of discrepancy) to BuilderOS internal logs. Detailed discrepancy information will be logged at `WARN` level.

## 5. Stop Conditions if Runtime Truth Disagrees

The verification process will trigger an alert and potentially pause further automated syncs under the following conditions:

*