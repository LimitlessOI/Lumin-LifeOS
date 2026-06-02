# AMENDMENT_41_MARKETINGOS: Proof G57-100 Remediation Blueprint

This document serves as the SSOT foundation for closing the proof gap identified as G57-100 within Amendment 41 for MarketingOS.

## 1. Exact Missing Implementation or Proof Gap

The current state lacks verifiable proof that MarketingOS successfully ingests and acknowledges `MarketingEvent.Type.CAMPAIGN_IMPRESSION` events, specifically those originating from the `AdService` component, and correctly updates the associated campaign metrics within the MarketingOS data store. The gap is the absence of an end-to-end verification mechanism demonstrating this data flow and persistence.

## 2. Smallest Safe Build Slice to Close It

Implement a lightweight, idempotent `MarketingEvent` listener within MarketingOS that specifically targets `CAMPAIGN_IMPRESSION` events. This listener will log the receipt of the event and attempt a minimal, atomic update to a dummy or staging campaign metric counter. The focus is on proving event reception and basic processing, not full feature implementation.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/src/events/marketingEventProcessor.js`: Add a new handler function for `CAMPAIGN_IMPRESSION` events.
*   `services/marketingos/src/events/eventHandlers.js`: Register the new handler.
*   `services/marketingos/src/data/campaignMetricsRepository.js`: Add a stub function `incrementImpressionCount(campaignId)` that logs the call and returns true. (This is a temporary stub for proof, not a full implementation).
*   `services/marketingos/test/unit/events/marketingEventProcessor.test.js`: Add a test case to verify the new handler is invoked and calls the stub repository function.

## 4. Verifier/Runtime Checks

1.  **Unit Test Verification:** Run `npm test services/marketingos/test/unit/events/marketingEventProcessor.test.js`. Expect all tests to pass, specifically the new test case asserting handler invocation and repository interaction.
2.  **Local Integration Test:**
    *   Start MarketingOS locally.
    *   Manually emit a `MarketingEvent.Type.CAMPAIGN_IMPRESSION` event (e.g., via a temporary script or a test endpoint) with a known `campaignId`.
    *   Monitor MarketingOS logs for the `CAMPAIGN_IMPRESSION` event receipt and the `incrementImpressionCount` stub function's log output.
    *   Verify that no errors are reported during event processing.
3.  **System Health Check:** After emitting the event, query a temporary debug endpoint