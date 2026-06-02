# Proof-Closing Blueprint Note: MarketingOS Proof G201-100

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

This note addresses the closure of proof point G201-100 as defined in Amendment 41 for MarketingOS integration.

## 1. Exact Missing Implementation or Proof Gap

The current gap for G201-100 is the absence of a dedicated data synchronization mechanism to push aggregated user engagement metrics for segment `G201` from LifeOS analytics services to the MarketingOS `CampaignPerformanceAPI`. Specifically, the `UserEngagementService` currently aggregates data but lacks the outbound integration to MarketingOS for this specific segment's performance tracking.

## 2. Smallest Safe Build Slice to Close It

Implement a new `MarketingOSSyncWorker` module responsible for:
1.  Querying aggregated `G201` user engagement data from the `UserEngagementService`.
2.  Transforming this data into the `CampaignPerformanceAPI` payload format.
3.  Initiating an authenticated `POST` request to the MarketingOS `CampaignPerformanceAPI` endpoint for `G201` metrics.
This worker will be scheduled to run daily.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/MarketingOSSyncWorker.js` (New file)
*   `services/marketingos/index.js` (Add export for `MarketingOSSyncWorker`)
*   `config/scheduler.js` (Add new daily job entry for `MarketingOSSyncWorker`)
*   `services/user-engagement/UserEngagementService.js` (Add a new method `getAggregatedG201Metrics()` if not already present, or ensure existing method supports `G20