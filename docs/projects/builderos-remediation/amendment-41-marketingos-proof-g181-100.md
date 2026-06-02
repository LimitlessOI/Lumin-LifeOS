# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Proof G181-100

This document serves as the Single Source of Truth (SSOT) foundation for closing the identified proof gap related to Amendment 41 for MarketingOS.

---

## 1. Exact Missing Implementation or Proof Gap

The `AMENDMENT_41_MARKETINGOS.md` blueprint describes the integration of a new user consent management mechanism within MarketingOS. The current proof coverage is insufficient to guarantee that consent changes (e.g., user opts out of email marketing) are consistently and immediately propagated to all integrated downstream marketing services (e.g., email sender, ad platform, analytics). Specifically, there is no automated runtime proof that a consent state change in LifeOS correctly triggers an update in MarketingOS's internal consent registry and subsequently updates all subscribed external marketing platforms within the defined SLA.

## 2. Smallest Safe Build Slice to Close It

Implement a dedicated `ConsentPropagationVerifier` module within the existing MarketingOS `verification` service. This module will subscribe to `LifeOS.UserConsentChanged` events, query MarketingOS's internal consent state, and then query a representative sample of critical downstream marketing services (e.g., `EmailService`, `AdPlatformService`) to confirm the consent state matches the expected state.

## 3. Exact Safe-Scope Files to Touch First

-   `services/marketingos/src/verification/ConsentPropagationVerifier.js` (new file)
-   `services/marketingos/src/verification/index.js` (to export and register the new verifier)
-   `services/marketingos/src/events/UserConsentChangedHandler.js` (review/confirm internal state update logic)
-   `services/marketingos/src/config/marketingos.js` (add configuration for downstream service verification endpoints, if needed)
-   `services/marketingos/src/integrations/EmailService.js` (add a `getConsentState(userId)` method for verification)
-   `services/marketingos/src/integrations/AdPlatformService.js` (add a `getConsentState(userId)` method for verification)

## 4. Verifier/Runtime Checks

-   **Event Subscription Check:** Verify `ConsentPropagationVerifier` successfully subscribes to `LifeOS.UserConsentChanged` events.
-   **Internal State Check:** On receiving an event, verify `MarketingOS.ConsentRegistry.getConsentState(userId)` reflects the new state within 500ms.
-   **Downstream Service Check:** For a predefined set of critical downstream services (e.g., `EmailService`, `AdPlatformService`), verify `service.getConsentState(userId)` reflects the new state within 2 seconds of the `UserConsentChanged` event.
-   **Error Handling:** Verify that propagation failures are logged with high severity and trigger alerts.
-   **Idempotency:** Verify that repeated consent changes for the same user do not lead to inconsistent states or errors.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `MarketingOS.ConsentRegistry