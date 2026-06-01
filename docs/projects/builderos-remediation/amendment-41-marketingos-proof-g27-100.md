Proof-Closing Blueprint Note: MarketingOS Proof-G27-100 - Campaign Conversion Event Persistence
1. Exact Missing Implementation or Proof Gap:
The current MarketingOS platform lacks a verified, durable persistence mechanism for `CampaignConversionEvent` data, specifically the `conversionId` and `campaignId`, into the core analytics store. While events may be emitted, their guaranteed storage and subsequent availability for reporting (the essence of proof-g27-100) are not explicitly implemented or proven.
2. Smallest Safe Build Slice to Close It:
Implement a dedicated event handler for `CampaignConversionEvent` that extracts the `conversionId`, `campaignId`, and relevant metadata (e.g., `timestamp`, `source`) and persists this data to the `marketing_events` db table. This handler must be idempotent and include basic errHdl for db operations.
3. Exact Safe-Scope Files to Touch First:
-   `src/marketingos/events/handlers/campaignConversionEventHandler.js` (new file for the handler logic)
-   `src/marketingos/events/eventBus.js` (to register `campaignConversionEventHandler` with the `CampaignConversionEvent` type)
-   `src/marketingos/data/marketingEventRepository.js` (to add or extend a method, e.g., `saveConversionEvent({ conversionId, campaignId, timestamp, source })`, for db interaction)
-   `src/marketingos/data/migrations/YYYYMMDDHHMMSS_add_conversion_event_columns_to_marketing_events.js` (if `marketing_events` table exists but lacks `conversionId` or `campaignId` columns, or `YYYYMMDDHHMMSS_create_marketing_events_table.js` if the table is entirely new).
4. Verifier/Runtime Checks:
-   Unit Test (`campaignConversionEventHandler.js`): Assert that the handler correctly parses `CampaignConversionEvent` payloads and invokes `marketingEventRepository.saveConversionEvent` with the extracted data. Mock the repository to ensure isolation.
-   Integration Test (End-to-End): Simulate the emission of a `CampaignConversionEvent` via the `eventBus`. After a short delay, query the `marketing_events` db table directly to confirm the presence of a new record matching the emitted event's `conversionId` and `campaignId`.
-   Runtime Monitoring: Observe application logs for `campaignConversionEventHandler` for any errors or warnings. Monitor the `marketing_events` table for new entries and verify that `conversionId` and `campaignId` columns are populated as expected for `CampaignConversionEvent` types.
-   API Verification: If a MarketingOS API exists to retrieve conversion data, use it to confirm that newly persisted events are queryable and accurate.
5. Stop Conditions if Runtime Truth Disagrees:
-   If `CampaignConversionEvent` records are not consistently appearing in the `marketing_events` table within 30 seconds of known event emissions in a staging environment.
-   If `campaignConversionEventHandler` logs show a persistent error rate exceeding 0.5% for processed events (e.g., db connection failures, schema validation errors).
-   If the `conversionId` or `campaignId` values stored in the db do not precisely match the values from the original emitted `CampaignConversionEvent` payload.
-   If the overall event processing latency for MarketingOS significantly increases (e.g., >15% increase in average processing time) after the deployment of this handler, indicating a performance regression.