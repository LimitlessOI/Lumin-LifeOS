# MarketingOS Proof-G843-100 Proof-Closing Blueprint Note

This document serves as the SSOT foundation for closing the proof-of-concept for MarketingOS integration G843-100, focusing on the `UserLifecycleEvent.ACCOUNT_CREATED` event.

## 1. Exact Missing Implementation or Proof Gap

The exact missing implementation is the production-ready, idempotent, and fully verified transmission of the `UserLifecycleEvent.ACCOUNT_CREATED` event from LifeOS to the designated MarketingOS event bus topic. This includes ensuring all required user profile attributes (`userId`, `email`, `signupTimestamp`, `sourceChannel`, etc.) are correctly extracted, transformed according to MarketingOS's schema, and reliably delivered. The current state may involve a non-production stub or an unverified integration.

## 2. Smallest Safe Build Slice to Close It

Implement a dedicated `MarketingOSEventPublisher` service within LifeOS. This service will:
1.  Subscribe to the internal `UserLifecycleEvent` stream.
2.  Filter for `ACCOUNT_CREATED` events.
3.  Transform the event payload into the MarketingOS-specific schema.
4.  Publish the transformed event to the configured `marketingos-event-bus` topic.
This slice focuses solely on this specific event and its transmission, ensuring minimal impact and clear scope.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketingos/MarketingOSEventPublisher.js` (New file: Implements the event subscription, transformation, and publishing logic.)
*   `src/services/marketingos/marketingosEventSchema.js` (New file: Defines the Joi/Zod schema for MarketingOS event payloads and transformation logic.)
*   `src/events/userLifecycleEvents.js` (Existing: Verify `ACCOUNT_CREATED` event structure and ensure it's correctly emitted.)
*   `src/config/env.js` (Existing: Add `MARKETINGOS_EVENT_BUS_TOPIC` and `MARKETINGOS_BUS_URL` environment variables.)
*   `src/app.js` or `src/server.js` (Existing: Instantiate and initialize `MarketingOSEventPublisher` during application startup, conditionally enabled by a feature flag.)

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `MarketingOSEventPublisher.test.js`: Verify correct payload transformation from `UserLifecycleEvent.ACCOUNT_CREATED` to MarketingOS schema.
    *   `MarketingOSEventPublisher.test.js`: Verify event bus publishing logic (mocking the bus client).
*   **Integration Tests:**
    *   Simulate a `UserLifecycleEvent.ACCOUNT_CREATED` emission within a test environment.
    *   Assert that the `marketingos-event-bus` (or a mock thereof) receives a correctly formatted message for the specific topic.
*   **End-to-End (E2E) Test (Staging):**
    *   Create a new user account in a staging LifeOS environment.
    *   Verify, via MarketingOS's API or UI, that the new user profile is created/updated with all expected attributes.
*   **Monitoring:**
    *   Observe `marketingos-event-bus` metrics for message counts, latency, and error rates related