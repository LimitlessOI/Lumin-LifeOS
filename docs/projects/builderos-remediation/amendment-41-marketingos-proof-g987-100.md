# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G987-100

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

This blueprint note addresses the proof-closing for Amendment 41, focusing on the foundational synchronization of user profile data from LifeOS to MarketingOS, as outlined in the source blueprint. The primary goal is to establish a reliable, event-driven mechanism for ensuring MarketingOS maintains an accurate and up-to-date view of LifeOS user profiles.

---

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a fully implemented and verified event-driven synchronization mechanism for `UserUpdated` events from LifeOS to MarketingOS. Specifically, the proof requires demonstrating that:
*   `UserUpdated` events are reliably emitted by the LifeOS user service upon relevant profile changes.
*   A dedicated handler consumes these events, transforms the data into the MarketingOS-expected format, and dispatches it via the MarketingOS API client.
*   MarketingOS successfully receives and processes these updates, reflecting the changes in its user profiles.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **Event Emission:** Ensuring the `User` model's update operations correctly trigger a `UserUpdated` event with relevant changed fields.
2.  **Event Consumption & Transformation:** Implementing a new event handler (`MarketingOSUserSyncHandler`) that listens for `UserUpdated` events. This handler will perform necessary data mapping/transformation from LifeOS user schema to MarketingOS user schema.
3.  **API Dispatch:** Utilizing the existing `MarketingOSClient` (or creating a minimal wrapper if not present) to send the transformed user data to the designated MarketingOS user update endpoint.

This slice focuses purely on the data flow for user updates, avoiding broader MarketingOS integrations or complex campaign logic.

### 3. Exact Safe-Scope Files to Touch First

*   `services/user/src/models/User.js`: Modify `pre-save` or `post-save` hooks (or equivalent) to emit `UserUpdated` events when specific fields (e.g., `email`, `subscriptionStatus`, `firstName`, `lastName`) are modified.
*   `services/user/src/events/UserEvents.js`: Define the `UserUpdated` event structure and payload. (If not existing, create this file to centralize event definitions).
*   `services/user/src/handlers/MarketingOSUserSyncHandler.js`: Create this new handler. It will import `UserEvents` and `integrations/marketingos/src/api/MarketingOSClient.js`.
*   `integrations/marketingos/src/api/MarketingOSClient.js`: Verify or extend the existing client to include a `updateUser(userId, userData)` method that correctly interfaces with the MarketingOS user API.
*   `services/user/src/index.js` (or equivalent entry point): Register `MarketingOSUserSyncHandler` to listen for `UserUpdated` events.

### 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `User.test.js`: Assert that `UserUpdated` event is emitted with correct payload when a user is updated.
    *   `MarketingOSUserSyncHandler.test.js`: Mock `MarketingOSClient` and assert that the handler correctly transforms and calls `updateUser` with the expected MarketingOS payload.
    *   `MarketingOSClient.test.js`: Assert that the `updateUser` method constructs and sends the correct HTTP request to MarketingOS.
*   **Integration Tests:**
    *   Create a test suite that simulates a user update in LifeOS (e.g., changing email).
    *   Assert that a corresponding entry appears in a mock MarketingOS endpoint's received data, or verify through logs that the `MarketingOSClient` successfully dispatched the update.
*   **Observability:**
    *   Monitor LifeOS event bus logs for `UserUpdated` events.
    *   Monitor `MarketingOSUserSyncHandler` logs for successful dispatches and any errors.
    *   Monitor MarketingOS API gateway logs for incoming requests from LifeOS.
    *   Verify directly in the MarketingOS UI/database that the test user's profile reflects the LifeOS update.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Event Emission Failure:** If `UserUpdated` events are not consistently emitted upon relevant user profile changes in LifeOS.
*   **Data Transformation Mismatch:** If the data sent to MarketingOS by `MarketingOSUserSyncHandler` does not match the expected schema or contains incorrect values.
*   **API Communication Failure:** If `MarketingOSClient` consistently reports errors (e.g., 4xx, 5xx status codes) when attempting to update users in MarketingOS.
*   **MarketingOS Data Inconsistency:** If, after a successful dispatch from LifeOS, the MarketingOS system does not reflect the updated user data