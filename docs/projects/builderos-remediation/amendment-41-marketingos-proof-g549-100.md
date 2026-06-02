# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Gap G549-100

**SSOT Foundation:** This document serves as the Single Source of Truth foundation for closing proof gap G549-100 related to Amendment 41.

---

### 1. Exact Missing Implementation or Proof Gap

The exact proof gap is the verified end-to-end transmission and structural integrity of `UserEngagementEvent` instances from LifeOS to MarketingOS, as defined by Amendment 41. Specifically, proof is required that:
*   `UserEngagementEvent`s are correctly serialized by LifeOS's `MarketingEventService`.
*   The serialized payload includes the mandatory `type: 'UserEngagementEvent'`, `event_id` (UUID), `user_id` (string), and `timestamp` (ISO 8601) fields.
*   The event is successfully dispatched to the configured MarketingOS endpoint.
*   MarketingOS acknowledges receipt of a structurally valid `UserEngagementEvent`.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves extending the existing `MarketingEventService` integration test suite to include a dedicated test case for `UserEngagementEvent` dispatch. This test will:
*   Instantiate a `UserEngagementEvent` with representative data.
*   Call `MarketingEventService.dispatch()` with this event.
*   Mock the external MarketingOS API client to capture the outgoing payload.
*   Assert the captured payload's structure and content against Amendment 41's specification for `UserEngagementEvent`.
No new production code changes are anticipated if the existing event dispatch mechanism is generic and robust. If specific serialization logic is required for `UserEngagementEvent`, a minimal extension to `MarketingEventService`'s event mapping or serialization utility would be included in this slice.

### 3. Exact Safe-Scope Files to Touch First

*   `services/marketing/MarketingEventService.test.js`: Add a new test block for `UserEngagementEvent` dispatch.
*   `services/marketing/MarketingEventService.js`: (Conditional) If specific serialization or mapping logic is required for `UserEngagementEvent` beyond generic event handling, add minimal, isolated logic here.
*   `types/marketing/UserEngagementEvent.js`: (Conditional) If a formal type definition for `UserEngagementEvent` is not yet present, define it to ensure consistent data structures.

### 4. Verifier/Runtime Checks

*   **Unit/Integration Tests (CI/CD):**
    *   Run `MarketingEventService.test.js`. The new test case must pass, asserting the correct payload structure and successful (mocked) dispatch.
    *   Verify test coverage for the `UserEngagementEvent` dispatch path.
*   **Local Development Environment:**
    *   Trigger a `UserEngagementEvent` via a local API endpoint or simulated user action.
    *   Use a network proxy (e.g., Charles, Wireshark) or browser developer tools to inspect the outgoing HTTP request to MarketingOS.
    *   Confirm the request body matches the `UserEngagementEvent` specification from Amendment 41.
*   **Staging Environment:**
    *   Deploy the build to the staging environment.
    *   Trigger a `UserEngagementEvent` through a staging user flow.
    *   Monitor MarketingOS's event ingestion logs or a dedicated dashboard to confirm the event is received, parsed correctly, and its data fields are as expected.

### 5. Stop Conditions if Runtime Truth Disagrees

*   The new test case in `MarketingEventService.test.js` fails, indicating incorrect serialization or dispatch.
*   The mocked MarketingOS API client receives an event payload that does not