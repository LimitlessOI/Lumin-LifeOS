# BuilderOS Remediation: Amendment 41 MarketingOS Proof (G321-100)

This document serves as a proof-closing blueprint note for Amendment 41, establishing the SSOT foundation for MarketingOS integration within LifeOS.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the full activation and real-time synchronization of user consent and preference changes from LifeOS to the MarketingOS platform, as defined by Amendment 41. Specifically, the event stream processing pipeline for `UserPreferenceUpdated` events is configured but not fully enabled to trigger the MarketingOS API update endpoint. This prevents MarketingOS from reflecting the most current user opt-in/out statuses and personalized content preferences, leading to potential compliance and personalization discrepancies.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves enabling the `UserPreferenceUpdated` event listener and its associated handler responsible for calling the MarketingOS API. This activation will be gated by a feature flag or environment variable to ensure controlled rollout. The handler will perform a minimal transformation of the LifeOS user preference data into the MarketingOS-specific payload format and dispatch it.

## 3. Exact Safe-Scope Files to Touch First

*   `src/config/featureFlags.js`: Introduce or update `MARKETINGOS_PREFERENCE_SYNC_ENABLED` flag to `true`.
*   `src/events/listeners/userPreferenceListener.js`: Uncomment or activate the `MarketingOSPreferenceSyncHandler` registration.
*   `src/services/marketingos/preferenceSyncService.js`: Review and ensure the `syncUserPreferences` function correctly maps LifeOS data to MarketingOS API schema and handles API calls.
*   `.env.production`: Ensure `MARKETINGOS_API_ENDPOINT` and `MARKETINGOS_API_KEY` are correctly set.

## 4. Verifier/Runtime Checks