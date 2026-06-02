# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - G277-100

**Signal:** This document — SSOT foundation.

This note closes the proof gap for `AMENDMENT_41_MARKETINGOS` related to `G277-100`, focusing on the correct end-to-end processing of `CampaignConversionEvent`s within MarketingOS.

---

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a verified, production-ready implementation and proof that `CampaignConversionEvent`s are correctly ingested, validated, trigger the `UserService.updateUserConversionMetrics` function, and are subsequently published to the `analytics.events` Kafka topic as specified in `AMENDMENT_41_MARKETINGOS.md`. Specifically, `G277-100` requires proof of successful data flow and side-effect execution for this event type.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Ensuring the `CampaignConversionEvent` schema is defined and validated upon ingestion.
2.  Implementing or verifying the handler within `MarketingEventProcessor` that dispatches `CampaignConversionEvent`s.
3.  Adding an integration test that simulates the ingestion of a `CampaignConversionEvent` and asserts the correct interactions with `UserService` and `KafkaProducer`. This test will serve as the primary proof.

### 3. Exact Safe-Scope Files to Touch First

*   `src/marketingos/events/schemas/campaignConversionEventSchema.js` (Define/verify Joi/Zod schema)
*   `src/marketingos/services/MarketingEventProcessor.js` (Ensure `processEvent` correctly handles `CampaignConversionEvent` type, calling `UserService` and `KafkaProducer`)
*   `src/marketingos/tests/integration/campaignConversionEvent.test.js` (New integration test file)
*   `src/marketingos/config/eventRegistry.js` (Register the new event type and its schema/handler)

### 4. Verifier/Runtime Checks

*   **Automated Test Pass:** The new integration test `src/marketingos/tests/integration/campaignConversionEvent.test.js` must pass. This test will:
    *   Mock `UserService.updateUserConversionMetrics` and assert it's called exactly once with the correct `userId` and `conversionType` from the event.
    *   Mock `KafkaProducer.publish` and assert it's called exactly once with the `analytics.events` topic and a payload matching the processed `CampaignConversionEvent` data.
    *   Assert no unhandled exceptions occur during event processing.
*   **Staging Environment Verification:**
    *   Deploy the changes to a staging environment.
    *   Manually trigger a `CampaignConversionEvent` via the designated ingestion endpoint.
    *   Monitor `UserService` logs for evidence of `updateUserConversionMetrics` being invoked with the correct parameters.
    *   Monitor Kafka `analytics.events` topic for the presence of the processed event payload.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If the `campaignConversionEvent.test.js` integration test fails for any reason (e.g., incorrect calls to mocked services, unexpected errors).
*   If, in staging, `UserService.updateUserConversionMetrics` is not called, or is called with incorrect data, after a `CampaignConversionEvent` is ingested.
*   If, in staging, the `CampaignConversionEvent` is not published to the `analytics.events` Kafka topic, or its payload is malformed/incomplete.
*   If the ingestion of `CampaignConversionEvent`s causes any unexpected system errors, performance degradation, or conflicts with existing event processing.
*   If the event processing logic deviates from the requirements outlined in `AMENDMENT_41_MARKETINGOS.md`.