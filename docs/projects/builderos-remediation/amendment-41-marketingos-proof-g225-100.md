# Proof-Closing Blueprint Note: Amendment 41 - MarketingOS SSOT Foundation (G225-100)

This document outlines the plan to close the implementation gap identified in `AMENDMENT_41_MARKETINGOS.md`, specifically focusing on establishing `marketingCampaignId_g225_100` as a Single Source of Truth (SSOT) within the MarketingOS platform.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the lack of a universally enforced, canonical generation and propagation mechanism for `marketingCampaignId_g225_100`. Currently, this identifier may be generated inconsistently or derived differently across various MarketingOS modules (e.g., `marketingos-core`, `marketingos-analytics`), leading to data discrepancies and hindering SSOT objectives. The proof gap is the absence of a verifiable, end-to-end flow where `marketingCampaignId_g225_100` originates from a single authoritative source and is consumed consistently by all downstream systems.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **Canonical ID Generation:** Modify `marketingos-core`'s `CampaignService` to be the sole generator and persister of `marketingCampaignId_g225_100` upon campaign creation. This ID must be immutable once set.
2.  **API Exposure:** Ensure `CampaignService`'s public API consistently exposes `marketingCampaignId_g225_100` for all campaign-related operations.
3.  **Downstream Consumption Refactor:** Update `marketingos-analytics` (and any other identified direct consumers) to fetch `marketingCampaignId_g225_100` exclusively from `marketingos-core`'s `CampaignService` API, rather than generating it or relying on other non-canonical sources.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos-core/src/campaign/CampaignService.js` (or `.ts`): Implement ID generation logic.
*   `services/marketingos-core/src/campaign/campaign.model.js` (or `.ts`): Add/update schema for `marketingCampaignId_g225_100` field.
*   `services/marketingos-core/src/campaign/campaign.api.js` (or `.ts`): Ensure API endpoints return `marketingCampaignId_g225_100`.
*   `services/marketingos-analytics/src/analytics/AnalyticsService.js` (or `.ts`): Modify data ingestion/processing to call `marketingos-core