# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - G1139-100

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

---

### 1. Exact Missing Implementation or Proof Gap

The core gap is the lack of a production-ready, robust mechanism to reliably capture and forward specified LifeOS user engagement events (e.g., `user_profile_updated`, `subscription_activated`, `goal_achieved`) to the external MarketingOS API endpoint as defined in `AMENDMENT_41_MARKETINGOS.md`. The proof gap specifically entails demonstrating that these events are correctly formatted, transmitted, and received by MarketingOS, and that the system handles transient failures gracefully without impacting core LifeOS functionality.

### 2. Smallest Safe Build Slice to Close It

Implement a dedicated, asynchronous event forwarding service/module responsible for:
a.  **Event Listening:** Subscribing to specific internal LifeOS events emitted by core services.
b.  **Event Transformation:** Mapping internal LifeOS event schemas to the MarketingOS-specific event schema.
c.  **Asynchronous Transmission:** Sending transformed events to the configured MarketingOS API endpoint using a non-blocking HTTP client.
d.  **Resilience:** Incorporating basic retry logic with exponential backoff for transient network or API errors.
e.  **Observability:** Logging success, failure, and retry attempts for auditing and monitoring.

This slice focuses solely on the outbound event flow to MarketingOS, without modifying existing LifeOS user features or TSOS customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketingOsEventForwarder.js`: (New File) Implements the event transformation, API call logic, and retry mechanism.
*   `src/config/marketingOs.js`: (New File) Stores MarketingOS API endpoint, API key, and any other necessary configuration.
*   `src/events/eventBus.js`: (Existing File) Add a subscription registration for `marketingOsEventForwarder` to listen for relevant LifeOS events.
*   `src/features/userProfile/userService.js`: (Existing File) Inject `eventBus.emit('user_profile_updated', { userId, changes })` after successful profile updates.
*   `src/features/subscriptions/subscriptionService.js`: (Existing File) Inject `eventBus.emit('subscription_activated', { userId, subscriptionId, planId })` after successful subscription activations.

### 4. Verifier/Runtime Checks

*   **Unit Tests (`src/services/marketingOsEventForwarder.test.js`):**
    *   Verify correct event schema transformation from LifeOS internal format to MarketingOS format.
    *   Mock HTTP requests to MarketingOS API to assert correct payload, headers, and authentication are sent.
    *   Test retry logic for transient network errors (e.g., 500, 503 status codes).
*   **Integration Tests:**
    *   Simulate a user action (e.g., calling `userService.updateProfile()`).
    *   Assert that `eventBus.emit()` is called with the expected event type and data.