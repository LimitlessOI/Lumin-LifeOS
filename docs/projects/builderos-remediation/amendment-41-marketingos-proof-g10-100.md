### Proof-Closing Blueprint Note: Amendment 41 - MarketingOS Integration (G10-100)

This document serves as the Single Source of Truth (SSOT) foundation for closing the proof gap identified in Amendment 41, concerning the integration of MarketingOS data into BuilderOS.

**1. Exact Missing Implementation or Proof Gap:**
The gap was the unverified, production-ready mechanism within BuilderOS to consume and correctly map `marketingCampaignID` and `marketingSource` metadata from incoming MarketingOS events for the `G10-100` campaign type. Previous attempts failed to correctly map these fields to the internal `builder_event_context` schema, leading to data loss and incorrect attribution.

**2. Smallest Safe Build Slice to Close It:**
*   Update `MarketingOSWebhookProcessor` to parse `marketingCampaignID` and `marketingSource` from incoming JSON.
*   Modify `BuilderEventMapper` to map these parsed values to `campaignId` and `source` within the `builder_event_context` object.
*   Ensure `BuilderEventPersistenceService` correctly stores these fields.
*   Add unit and integration tests to validate end-to-end data flow for `G10-100` campaign events.

**3. Exact Safe-Scope Files to Touch First:**
*   `services/marketingos/MarketingOSWebhookProcessor.js`
*   `services/builder/BuilderEventMapper.js`
*   `services/builder/BuilderEventPersistenceService.js`
*   `tests/unit/marketingos/MarketingOSWebhookProcessor.test.js`
*   `tests/integration/builder/MarketingOSIntegration.test.js`
*   `schemas/builder_event_context.json`

**4. Verifier/Runtime Checks:**
*   **Unit Tests:** All new/modified unit tests for `MarketingOSWebhookProcessor` and `BuilderEventMapper` pass.
*   **Integration Tests:** `MarketingOSIntegration.test.js` suite passes, verifying simulated `G10-100` events correctly populate `campaignId` and `source` in persisted `builder_event_context`.
*   **Staging Environment:** Deploy to staging. Monitor BuilderOS event logs for `G10-100` campaign events; verify `campaignId` and `source` are present and correctly attributed in at least 10 distinct events.
*   **Data Integrity:** Query `builder_events` table in staging to confirm `campaignId` and `source` population for recent `G10-100` events.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   Any unit or integration test failure related to MarketingOS event processing.
*   Absence or incorrect values for `campaignId` or `source` in BuilderOS event logs for `G10-100` events in staging.
*   Discrepancy between expected and actual `campaignId`/`source` values in `builder_events` table for `G10-100` events.
*   Introduction of new errors or regressions in existing BuilderOS event processing.
*   Performance degradation in `MarketingOSWebhookProcessor` or `BuilderEventPersistenceService` during staging tests.