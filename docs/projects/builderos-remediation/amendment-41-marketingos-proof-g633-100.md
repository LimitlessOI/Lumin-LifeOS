<!-- SYNOPSIS: Amendment 41: MarketingOS Proof-G633-100 - Proof-Closing Blueprint Note -->

# Amendment 41: MarketingOS Proof-G633-100 - Proof-Closing Blueprint Note

This document serves as a proof-closing blueprint note for the specific deliverable `G633-100` under Amendment 41 for MarketingOS, as outlined in `docs/projects/AMENDMENT_41_MARKETINGOS.md`. The objective is to confirm the successful integration and queryability of `MarketingCampaignEvent` data, specifically ensuring the `campaignId` field is indexed and accessible for MarketingOS services.

---

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a confirmed, performant mechanism for MarketingOS to query `MarketingCampaignEvent` data by `campaignId`. While events may be ingested, the proof requires explicit indexing of `campaignId` in the event store and a dedicated, read-only API endpoint to retrieve events based on this identifier, ensuring data integrity and availability for MarketingOS analytics and targeting.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
a.  Verifying or adding a database index on the `campaignId` field within the `MarketingCampaignEvent` data store.
b.  Implementing a new, read-only API endpoint (`GET /marketing/campaign-events?campaignId={id}`) that leverages this index to efficiently retrieve relevant `MarketingCampaignEvent` records.
c.  Ensuring the `eventProcessor` correctly extracts and persists the `campaignId` for indexing.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketing/eventProcessor.js`: Review `processEvent` logic to confirm `campaignId` extraction and persistence. No modification expected if already correct.
*   `src/data/marketing/campaignEventRepository.js`: Add or verify index definition for `campaignId` in the underlying data store schema/model. Implement `findByCampaignId` method.
*   `src/api/marketing/routes.js`: Add a new `GET` route for `/marketing/campaign-events` with a `campaignId` query parameter.
*   `src/api/marketing/controllers/campaignEventController.js`: Implement `getCampaignEventsByCampaignId` controller function, utilizing `campaignEventRepository.findByCampaignId`.

### 4. Verifier/Runtime Checks

1.  **Data Ingestion Test:** Ingest at least three distinct `MarketingCampaignEvent` objects, each with a unique `campaignId` (e.g., `campaignId-test-g633-100-A`, `campaignId-test-g633-100-B`, `campaignId-test-g633-100-C`).
2.  **API Query Test:**
    *   Execute `GET /marketing/campaign-events?campaignId=campaignId-test-g633-100-A`.
    *   Verify the response contains only the event(s) associated with `campaignId-test-g633-100-A` and matches the ingested data.
    *   Repeat for `campaignId-test-g633-100-B` and `campaignId-test-g633-100-C`.
3.  **Negative Test:** Execute `GET /marketing/campaign-events?campaignId=non-existent-campaign`. Verify the response is an empty array or appropriate 404/204 status.
4.  **Performance Check:** Monitor query latency for the new endpoint. Queries by `campaignId` should complete within acceptable thresholds (e.g., < 50ms for typical load).

### 5. Stop Conditions if Runtime Truth Disagrees

*   The new API endpoint returns 4xx or 5xx errors for valid queries.
*   Queries by `campaignId` return incorrect, incomplete, or extraneous `MarketingCampaignEvent` data.
*   Significant performance degradation (e.g., queries consistently exceeding 200ms) is observed when querying by `campaignId`, indicating a potential indexing issue.
*   The `eventProcessor` fails to correctly parse or persist `campaignId` from incoming events, leading to data loss or corruption.