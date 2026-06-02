# Amendment 41: MarketingOS Proof G407-100 - SSOT Foundation Blueprint Note

This document outlines the proof-closing blueprint note for MarketingOS Proof G407-100, focusing on establishing the Single Source of Truth (SSOT) foundation for user marketing consent.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a robust, verifiable, and real-time synchronization mechanism to ensure that user marketing consent preferences, specifically the `marketing_opt_in` status as managed and stored in LifeOS (the designated SSOT), are accurately and promptly reflected and enforced within MarketingOS. Proof G407-100 requires demonstrating that a user's `marketing_opt_in` status, when updated in LifeOS, propagates correctly to MarketingOS and that MarketingOS respects this status for outreach decisions.

## 2. Smallest Safe Build Slice to Close It

Implement an event-driven synchronization pipeline for `marketing_opt_in` status from LifeOS to MarketingOS. This slice focuses on:
1.  **LifeOS Event Emission:** When a user's `marketing_opt_in` status changes in LifeOS, an event is published to a shared event bus.
2.  **MarketingOS Event Subscription:** A dedicated MarketingOS service subscribes to these events.
3.  **MarketingOS Internal State Update:** Upon receiving an event, MarketingOS updates its internal representation of the user's `marketing_opt_in` status.
4.  **Verification Endpoint:** A temporary, internal debug endpoint in MarketingOS to query the current `marketing_opt_in` status for a given user ID, allowing for direct verification of synchronization.

## 3. Exact Safe-Scope Files to Touch First

*   `services/lifeos/src/events/user-preferences.js`: Extend existing event publishing logic to emit a `user.marketing_opt_in.updated` event when the status changes.
*   `services/marketingos/src/subscribers/lifeos-user-preferences.js`: (New file) Create a new ESM module to subscribe to `user.marketing_opt_in.updated` events from the shared event bus.
*   `services/marketingos/src/models/user-profile.js`: Modify the `UserProfile` model to include `marketingOptIn` (boolean) and `marketingOptInLastUpdated` (timestamp) fields, if not already present.
*   `services/marketingos/src/api/debug/user-marketing-status.js`: (New file) Implement a simple GET endpoint `/debug/user/:userId/marketing-status` that returns the `marketingOptIn` status from the MarketingOS internal user profile store.

## 4. Verifier/Runtime Checks

*   **Unit Test (LifeOS):** Verify that `services/lifeos/src/events/user-preferences.js` correctly publishes a `user.marketing_opt_in.updated` event with the correct `userId` and `status` payload when a user's marketing preference is updated.
*   **Integration Test (End-to-End):**
    1.  Programmatically update a test user's `marketing_opt_in` status in LifeOS.
    2.  Wait for a short, defined interval (e.g., 2 seconds).
    3.  Query the MarketingOS debug endpoint (`/debug/user/:userId/marketing-status`) for the test user.
    4.  Assert that the returned `marketingOptIn` status matches the updated status from LifeOS.
*   **Manual Verification:**
    1.  Update