### Proof-Closing Blueprint Note: MarketingOS SSOT Foundation (G149-100)

**1. Exact Missing Implementation or Proof Gap:**
The current system lacks explicit runtime validation and logging within the `AnalyticsService` to confirm that `MarketingOS.campaign.id` is consistently used as the Single Source of Truth (SSOT) identifier for campaign-related events. Specifically, for proof point `G149-100`, there is no dedicated mechanism to assert this SSOT adherence at the data ingestion boundary of the `AnalyticsService` for all incoming campaign event payloads. This gap means we cannot programmatically verify that downstream systems are correctly consuming and prioritizing the designated SSOT `campaignId`.

**2. Smallest Safe Build Slice to Close It:**
Implement a lightweight, configurable data validation and logging interceptor within the `AnalyticsService`'s campaign event ingestion pipeline. This interceptor will specifically inspect incoming campaign event payloads to ensure the `campaignId` field (derived from `MarketingOS.campaign.id`) is present, adheres to the expected format (e.g., UUID or specific string pattern), and is recognized as the primary campaign identifier. It will log any deviations as warnings or errors without initially blocking event processing, allowing for observation and phased enforcement.

**3. Exact Safe-Scope Files to Touch First:**
*   `services/analytics/src/ingestion/campaignEventProcessor.js`: Introduce or modify the event processing logic to integrate the new validation interceptor.
*   `services/analytics/src/schemas/campaignEventSchema.js`: Update the Joi/Zod schema (or equivalent) to explicitly define the `campaignId` field as required and specify its expected format, potentially adding metadata indicating its SSOT status.
*   `services/analytics/src/config/featureFlags.js`: Add a new feature flag (e.g., `ENABLE_CAMPAIGN_ID_SSOT_VALIDATION`) to control the activation of this interceptor.
*   `services/analytics/test/integration/campaignEvents.test.js`: Add new test cases to verify the validation logic's behavior with valid and invalid `campaignId` payloads.

**4. Verifier/Runtime Checks:**
*   **Log Monitoring:** Monitor `AnalyticsService` logs for specific `SSOT_VALIDATION_WARNING` or `SSOT_VALIDATION_ERROR` entries. These logs will indicate instances where `campaignId` is missing, malformed, or does not conform to SSOT expectations.
*   **Data