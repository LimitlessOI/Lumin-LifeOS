<!-- SYNOPSIS: Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - G237-100 -->

# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - G237-100

This document outlines the proof-closing blueprint for AMENDMENT_41_MARKETINGOS, establishing the SSOT foundation for its implementation.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the lack of a verified, end-to-end data flow from LifeOS user consent events to MarketingOS, specifically proving that the `UserConsentUpdated` event (as defined in AMENDMENT_41_MARKETINGOS.md) is correctly captured, processed, and dispatched to the designated MarketingOS endpoint. The current state lacks a demonstrable mechanism and verification for this critical data synchronization.

## 2. Smallest Safe Build Slice to Close It

Implement a minimal, event-driven `MarketingOSConsentSyncService` within LifeOS. This service will subscribe to `UserConsentUpdated` events, transform the relevant consent data according to the AMENDMENT_41_MARKETINGOS.md specification, and dispatch it to a configurable (initially mock/staging) MarketingOS API endpoint. This slice focuses solely on the event-to-dispatch mechanism, not full MarketingOS integration logic.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/MarketingOSConsentSyncService.js` (New service to handle event subscription and dispatch)
*   `src/events/UserConsentUpdatedEvent.js` (Ensure event structure aligns with amendment, or define if missing)
*   `src/config/marketingos.js` (New or updated configuration for MarketingOS API endpoint and credentials)
*   `src/app.js` or `src/index.js` (To instantiate and register `MarketingOSConsentSyncService` with the event bus)
*   `tests/unit/MarketingOSConsentSyncService.test.js` (Unit tests for event processing and data transformation)
*   `tests/integration/marketingos-consent-flow.test.js` (Integration tests simulating event and verifying dispatch attempt)

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   Verify `MarketingOSConsentSyncService` correctly subscribes to `UserConsentUpdatedEvent`.
    *   Assert that the service transforms `UserConsentUpdatedEvent` payload into the expected MarketingOS API request body schema.
    *   Confirm the service attempts to call the configured MarketingOS endpoint with the transformed data.
*   **Integration Tests:**
    *   Simulate a `UserConsentUpdatedEvent` being published.
    *   Mock the external MarketingOS API call and assert that `MarketingOSConsentSyncService` makes an HTTP POST request to the correct URL with the expected JSON payload.
    *   Verify appropriate logging occurs on successful dispatch and on errors.
*   **Staging Environment Deployment:**
    *   Deploy the build slice to a staging environment.
    *   Trigger a `UserConsentUpdated` event for a test user via LifeOS UI/API.
    *   Monitor `MarketingOSConsentSyncService` logs for successful dispatch messages.
    *   If a mock MarketingOS endpoint is available, verify it receives the exact data payload specified in AMENDMENT_41_MARKETINGOS.md.

## 5. Stop Conditions if Runtime Truth Disagrees

*   Unit tests for `MarketingOSConsentSyncService` fail, indicating incorrect event handling or data transformation.
*   Integration tests fail, showing the service does not correctly react to `UserConsentUpdatedEvent` or does not attempt to dispatch data to the mock endpoint.
*   Staging environment logs show no dispatch attempts for `UserConsentUpdated` events, or repeated dispatch failures (e.g., network errors, authentication issues with the mock endpoint).
*   The mock MarketingOS endpoint (if used) does not receive the expected data payload, or the received data schema/content deviates