# AMENDMENT_41_MARKETINGOS Proof-G18-100: User Profile Event Propagation Verification

This document outlines the proof-closing blueprint note for gap G18-100 related to AMENDMENT_41_MARKETINGOS.

## 1. Exact Missing Implementation or Proof Gap

Verification that `ProfileUpdated` events originating from LifeOS are correctly transformed and propagated to MarketingOS for real-time user segmentation updates, specifically ensuring the `user_segment_affinity` attribute is accurately derived and transmitted. The current gap is the lack of explicit runtime proof that this specific attribute's propagation is robust and consistent.

## 2. Smallest Safe Build Slice to Close It

Implement and verify the `MarketingOSAdapter.handleProfileUpdateEvent` function's logic for `user_segment_affinity` derivation and payload construction. This slice focuses on the data transformation and dispatch mechanism, assuming the underlying event bus and `MarketingOS.publishEvent` are functional.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketingos/MarketingOSAdapter.js`: Modify or extend the `handleProfileUpdateEvent` method to explicitly derive and include `user_segment_affinity` in the `UserSegmentUpdate` payload.
*   `src/events/handlers/profileUpdateEventHandler.js`: Confirm this handler correctly invokes `MarketingOSAdapter.handleProfileUpdateEvent` with the full `ProfileUpdated` event data.
*   `src/tests/unit/marketingos/MarketingOSAdapter.test.js`: Add new unit tests to cover the `user_segment_affinity` derivation logic within `handleProfileUpdateEvent`.
*   `src/tests/integration/marketingos/profileEventIntegration.test.js`: Add an integration test to simulate a `ProfileUpdated` event and assert the correct `UserSegmentUpdate` payload is passed to `MarketingOS.publishEvent`.

## 4. Verifier/Runtime Checks

*   **Unit Test Pass:** All new and existing unit tests for `MarketingOSAdapter.handleProfileUpdateEvent` pass, specifically verifying `user_segment_affinity` mapping for various `ProfileUpdated` event structures.
*   **Integration Test Pass:** The new integration test passes, confirming that a simulated `ProfileUpdated` event results in `MarketingOS.publishEvent` being called with the expected `UserSegmentUpdate` payload, including the correct `user_segment_affinity`.
*   **Staging Environment Observation:**
    *   Trigger a `ProfileUpdated` event for a test user in the staging LifeOS environment.
    *   Monitor MarketingOS event ingestion logs for the corresponding `UserSegmentUpdate` event.
    *   Verify the `user_segment_affinity` attribute within the ingested MarketingOS event payload matches the expected value based on the LifeOS profile update.
    *   Query MarketingOS user segmentation data directly to confirm the `user_segment_affinity` for the test user reflects the updated profile.

## 5. Stop Conditions if Runtime Truth Disagrees

*   Unit tests for `MarketingOSAdapter.handleProfileUpdateEvent` fail, indicating incorrect `user_segment_affinity` derivation or payload construction.
*   Integration tests fail, showing `MarketingOS.publishEvent` is not called or is called with an incorrect `UserSegmentUpdate` payload (missing or wrong `user_segment_affinity`).
*   MarketingOS event ingestion logs do not show a `UserSegmentUpdate` event after a `ProfileUpdated` event, or the ingested event is malformed/missing `user_segment_affinity`.
*   MarketingOS segmentation data for the test user does not reflect the expected `user_segment_affinity` after the profile update.
*   Any observed performance degradation in the event processing pipeline or increased error rates in `MarketingOSAdapter` logs.