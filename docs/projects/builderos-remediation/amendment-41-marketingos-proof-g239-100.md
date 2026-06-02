# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - G239-100

This document serves as the SSOT foundation for closing the proof gap G239-100 related to Amendment 41 (MarketingOS Integration).

## 1. Exact Missing Implementation or Proof Gap

The current implementation of Amendment 41 lacks a robust, auditable, and automatically verifiable mechanism to ensure that user marketing consent preferences (specifically `marketingOptOut` status) are consistently enforced at the point of data transmission to or consumption by MarketingOS. While consent capture exists, the proof gap is the absence of a runtime enforcement layer that actively prevents marketing-related data flow for opted-out users, leading to potential compliance risks.

## 2. Smallest Safe Build Slice to Close It

Introduce a dedicated `MarketingConsentEnforcer` module or middleware within the LifeOS service layer responsible for orchestrating data interactions with MarketingOS. This module will intercept all outbound marketing-related data payloads or inbound MarketingOS requests that require user context. It will query the user's `marketingOptOut` status from the `UserPreferences` model and, if `true`, will block or sanitize the relevant data before it reaches MarketingOS. This slice focuses solely on the enforcement logic and its immediate integration point, not on consent UI or storage modifications.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketing/marketingDataService.js`: (Assuming this service handles direct MarketingOS interactions). Introduce an `enforceConsent` middleware function or a pre-processing step within relevant methods.
*   `services/marketing/marketingDataService.test.js`: Add unit tests for the `enforceConsent` logic, covering opt-in, opt-out, and edge cases (e.g., user preferences not found).
*   `models/userPreferences.js`: (Assuming this model stores user consent). Ensure a performant method exists to retrieve `marketingOptOut` status for a given `userId`.
*   `utils/logger.js`: Add specific logging for consent enforcement actions (e.g., `marketingDataBlocked`, `marketingDataAllowed`).

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   Verify `MarketingConsentEnforcer` blocks data when `marketingOptOut` is `true`.
    *   Verify `MarketingConsentEnforcer` allows data when `marketingOptOut` is `false` or undefined.
    *   Verify correct logging occurs for both blocked and allowed scenarios.
*   **Integration Tests (Staging/Dev):**
    *   Create a test user with `marketingOptOut: true`. Perform actions that would normally trigger MarketingOS tracking. Assert that no corresponding tracking events or user data appear in mocked or actual MarketingOS logs/endpoints.
    *   Create a test user with `marketingOptOut: false`. Perform the same actions. Assert that tracking events and user data *do* appear.
*   **Runtime Monitoring:**
    *   Monitor `utils/logger.js` output for `marketingDataBlocked` events. Ensure these events correlate with expected user opt-out actions and do not show unexpected blocking for opted-in users.
    *   Monitor latency introduced by the `MarketingConsentEnforcer` to ensure it remains within acceptable performance thresholds.

## 5. Stop Conditions If Runtime Truth Disagrees

*   If integration tests demonstrate that MarketingOS still receives data for users with `marketingOptOut: true`.
*   If runtime monitoring reveals a significant number of `marketingDataBlocked` events for users who are *not* opted out, indicating false positives.
*   If the `MarketingConsentEnforcer` introduces a measurable performance degradation (e.g., >10ms latency increase per relevant request) that impacts user experience or service SLAs.
*   If the `userPreferences` model cannot reliably or performantly provide the `marketingOptOut` status, leading to enforcement failures or timeouts.