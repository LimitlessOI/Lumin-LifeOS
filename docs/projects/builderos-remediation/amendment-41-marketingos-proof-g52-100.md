<!-- SYNOPSIS: Amendment 41 MarketingOS Proof-Closing Blueprint Note (G52-100) -->

The instruction to write a .md file contradicts the verifier's attempt to execute it as a Node.js module, leading to an ERR_UNKNOWN_FILE_EXTENSION.
# Amendment 41 MarketingOS Proof-Closing Blueprint Note (G52-100)

This document serves as the SSOT foundation for closing the proof gap identified in Amendment 41 MarketingOS, specifically concerning the integration and processing of marketing campaign attribution data within BuilderOS.

## 1. Exact Missing Implementation or Proof Gap

The primary gap was the lack of a robust, verifiable mechanism within BuilderOS to correctly attribute and process campaign performance metrics originating from MarketingOS, particularly for new campaign types introduced by Amendment 41. Specifically, the proof failed to demonstrate:
*   Consistent data schema adherence for `campaign_attribution_id` and `conversion_event_type` across MarketingOS export and BuilderOS ingestion.
*   Correct mapping of MarketingOS `campaign_segment` values to BuilderOS internal `project_tag` categories.
*   Idempotent processing of incoming MarketingOS campaign updates to prevent duplicate or erroneous metric aggregation in BuilderOS analytics.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Updating the BuilderOS data ingestion pipeline to validate and transform incoming MarketingOS campaign data.
*   Implementing a new data mapping service or extending an existing one to handle `campaign_segment` to `project_tag` translation.
*   Enhancing the BuilderOS analytics aggregation logic to incorporate the new attribution IDs and ensure idempotent updates.
*   Adding specific unit and integration tests for the new data flow.

## 3. Exact Safe-Scope Files to Touch First

*   `services/builderos-marketing-ingest/src/handlers/processMarketingCampaignUpdate.js`: Update data validation and initial transformation logic.
*   `services/builderos-marketing-ingest/src/mappers/marketingSegmentToProjectTag.js`: (New file or extend existing) Implement or update mapping logic.
*   `services/builderos-analytics/src/aggregators/campaignPerformanceAggregator.js`: Modify aggregation logic for new attribution and idempotency.
*   `services/builderos-marketing-ingest/tests/unit/processMarketingCampaignUpdate.test.js`: Add unit tests.
*   `services/builderos-marketing-ingest/tests/integration/marketingCampaignFlow.test.js`: Add integration tests for end-to-end data flow.

## 4. Verifier/Runtime Checks

*   **Unit Tests:** All new and modified unit tests for `processMarketingCampaignUpdate.js`, `marketingSegmentToProjectTag.js`, and `campaignPerformanceAggregator.js` must pass.
*   **Integration Tests:** The `marketingCampaignFlow.test.js` integration suite must pass, specifically verifying:
    *   Successful ingestion and transformation of a sample MarketingOS campaign update payload.
    *   Correct `campaign_segment` to `project_tag` mapping.
    *   Accurate increment of `conversion_event_type` metrics in BuilderOS analytics.
    *   Idempotent processing: sending the same payload twice results in no change or correct delta, not double counting.
*   **Staging Environment Data Flow:** Deploy to a BuilderOS staging environment. Trigger a simulated MarketingOS campaign update. Verify in BuilderOS monitoring and analytics dashboards that the new campaign data is correctly reflected, attributed, and