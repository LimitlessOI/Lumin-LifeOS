# AMENDMENT_41_MARKETINGOS: Proof-Closing Blueprint Note (G17-100)

**Signal:** This document — SSOT foundation.

---

## 1. Exact Missing Implementation or Proof Gap

The current LifeOS platform lacks a real-time, event-driven mechanism to reliably synchronize user email opt-in status changes from the `UserPreferences` service to the MarketingOS `ContactManagement` service. Specifically, `proof-g17-100` targets the absence of a dedicated event and handler to propagate `user.emailOptInStatus` updates, ensuring MarketingOS maintains a Single Source of Truth for user communication preferences.

## 2. Smallest Safe Build Slice to Close It

Implement an event-driven synchronization pipeline:
1.  **Event Definition:** Define a new `UserEmailOptInStatusUpdated` event.
2.  **Event Emission:** Modify the `UserPreferencesService` to emit this event whenever a user's `emailOptInStatus` is updated.
3.  **Integration Service:** Create a new `MarketingOSIntegrationService` responsible for subscribing to `UserEmailOptInStatusUpdated` events.
4.  **Event Handler:** Within the `MarketingOSIntegrationService`, implement a handler that consumes the event, transforms the payload to match MarketingOS API requirements, and invokes the MarketingOS `updateContactPreference` API endpoint.
5.  **API Client:** Develop a dedicated `MarketingOSClient` module for robust API interaction, including authentication and error handling.

## 3. Exact Safe-Scope Files to Touch First

*   `services/user-preferences/src/events/UserEmailOptInStatusUpdated.js` (New file: Event definition)
*   `services/user-preferences/src/UserPreferencesService.js` (Modification: Add event emission logic)
*   `services/marketingos-integration/src/index.js` (New file: Service entry point, event subscription)
*   `services/marketingos-integration/src/handlers/UserEmailOptInStatusHandler.js` (New file: Event handler logic)
*   `services/marketingos-integration/src/api/MarketingOSClient.js` (New file: MarketingOS API client)
*   `services/marketingos-integration/src/config.js` (New file: Configuration for MarketingOS API)
*   `services/marketingos-integration/package.json` (New file: Service metadata and dependencies)

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `UserPreferencesService` test: Verify `UserEmailOptInStatusUpdated` event is emitted with correct payload upon `emailOptInStatus` change.
    *   `UserEmailOptInStatusHandler` test: Verify event processing logic, data transformation, and `MarketingOSClient` invocation with expected arguments.
    *   `MarketingOSClient` test: Verify successful API call to a mock MarketingOS endpoint with correct headers and body.
*   **Integration Tests (Staging/Pre-prod):**
    *   Simulate a user updating their email opt-in status via LifeOS UI/API.
    *   Verify that the `MarketingOSIntegrationService` processes the event and successfully calls the MarketingOS API (using a test/mock MarketingOS instance).
    *   Confirm the `emailOptInStatus` is correctly reflected in the MarketingOS test environment for the specific user.
*   **Observability:**
    *   Monitor `UserEmailOptInStatusUpdated` event emission rates and success/failure.
    *   Monitor `MarketingOS