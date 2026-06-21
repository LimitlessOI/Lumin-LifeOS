<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G1021 100. -->

Proof-Closing Blueprint Note: Amendment 41 - MarketingOS Proof Gap G1021-100
This document addresses the identified proof gap G1021-100 related to Amendment 41, ensuring the robust and compliant integration of MarketingOS with LifeOS user consent mechanisms.
---
1. Exact Missing Implementation or Proof Gap
The current integration with MarketingOS lacks a robust, centralized enforcement mechanism to ensure that user marketing consent preferences, as managed within the LifeOS `UserPreferencesService`, are consistently applied to all outbound API calls and data synchronizations with MarketingOS. Specifically, the `marketingConsentStatus` field is not reliably propagated or verified at the point of interaction, leading to a potential compliance gap where marketing actions might be triggered for users who have explicitly denied consent.
2. Smallest Safe Build Slice to Close It
Implement a dedicated mw layer within the `marketing-integration` service. This mw will intercept all relevant outbound requests to MarketingOS, query the `UserPreferencesService` for the current user's `marketingConsentStatus`, and either block the request, modify its payload to reflect consent, or log a compliance warning based on the user's preference. This ensures that consent is checked immediately before data leaves LifeOS control.
3. Exact Safe-Scope Files to Touch First
-   `services/user-preferences/src/UserPreferencesService.js`: Verify the export and interface for retrieving `marketingConsentStatus` for a given user ID. (Read-only verification)
-   `services/marketing-integration/src/MarketingIntegrationService.js`: Identify specific methods that make outbound calls to MarketingOS and will be subject to consent enforcement.
-   `services/marketing-integration/src/mw/marketingConsentMiddleware.js`: (NEW FILE) Implement the mw logic to fetch consent and enforce rules.
-   `services/marketing-integration/src/api/v1/marketingRoutes.js`: Apply the new `marketingConsentMiddleware` to relevant API routes that trigger MarketingOS interactions.
-   `services/marketing-integration/src/utils/marketingApiAdapter.js`: (If applicable) Modify any direct API call wrappers to integrate the mw or consent check.
4. Verifier/Runtime Checks
-   Unit Tests (`marketingConsentMiddleware.js`):
-   Test cases for `marketingConsentStatus: 'granted'` allowing requests to proceed.
-   Test cases for `marketingConsentStatus: 'denied'` blocking requests or modifying payloads as per policy.
-   Test cases for `marketingConsentStatus: 'pending'` or `null` handling (e.g., default to denied or require explicit grant).
-   Test cases for errHdl when `UserPreferencesService` is unreachable.
-   Integration Tests (`marketing-integration` service):
       Simulate an authenticated user with `marketingConsentStatus: 'denied'` attempting to subscribe to a newsletter via a LifeOS apiEP that triggers a MarketingOS call. Assert that the MarketingOS call is not* made or is made with a `denied` flag.
       Simulate an authenticated user with `marketingConsentStatus: 'granted'` performing the same action. Assert that the MarketingOS call is* made successfully.
-   Manual Verification (Staging/Dev):
-   Scenario 1 (Consent Granted): Create a test user, grant marketing consent in LifeOS. Perform an action that triggers a MarketingOS interaction (e.g., sign up for a specific campaign). Verify that the action completes successfully and the user's data appears correctly in MarketingOS (if accessible).
       Scenario 2 (Consent Denied): Create a test user, deny marketing consent in LifeOS. Perform the same action. Verify that the action is blocked, an appropriate user-facing message is displayed, and no* corresponding data or event is sent to MarketingOS.
-   Scenario 3 (Consent Changed): Change a user's consent from granted to denied, then attempt a marketing action. Verify the new denied status is respected.
5. Stop Conditions if Runtime Truth Disag