<!-- SYNOPSIS: Amendment 41: MarketingOS Proof G61-100 - Proof-Closing Blueprint Note -->

# Amendment 41: MarketingOS Proof G61-100 - Proof-Closing Blueprint Note

This document serves as the SSOT foundation for closing the proof gap related to Amendment 41, specifically for MarketingOS integration concerning "Goal 61" (G61) and proof identifier "100".

## 1. Exact Missing Implementation or Proof Gap

The current LifeOS platform lacks a verified, production-ready mechanism to reliably emit a `UserEngagementEvent` with `goalId: 'g61'` and `proofId: '100'` upon a user's successful completion of "Goal 61". Consequently, MarketingOS cannot reliably consume this critical signal for targeted campaigns and analytics, leading to a gap in the specified data flow.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
a. Identifying the precise point within the existing user goal completion flow where "Goal 61" is marked as complete.
b. Integrating an event emission call at this point, leveraging the existing event bus infrastructure.
c. Ensuring the emitted `UserEngagementEvent` conforms to the expected schema, including `goalId: 'g61'` and `proofId: '100'`.
d. Adding a basic, non-production mock consumer within the development environment to log and verify the emitted event's structure and content.

## 3. Exact Safe-Scope Files to Touch First

*   `services/user-goals/index.js`: (Assuming this service handles goal completion logic) Introduce event emission logic here.
*   `events/UserEngagementEvent.js`: (If not already defined or needs schema update) Ensure the event definition supports `goalId` and `proofId`.
*   `tests/services/user-goals.test.js`: Add unit tests to verify the `UserEngagementEvent` is emitted correctly upon "Goal 61" completion.
*   `integrations/marketingos/dev-mock-consumer.js`: (New file, for local dev/test only) A simple Node.js script to listen for and log `UserEngagementEvent`s on the local event bus.

## 4. Verifier/Runtime Checks

*   **Unit Tests:** `npm test services/user-goals.test.js` should pass, specifically asserting that `UserEngagementEvent` is emitted with `goalId: 'g61'` and `proofId: '100'` when a user completes Goal 61.
*   **Local Integration Test:** Run `node integrations/marketingos/dev-mock-consumer.js` and then simulate a user completing "Goal 61" in a local development environment. The mock consumer's console output must show the correctly structured `UserEngagementEvent`.
*   **Event Bus Monitoring (Staging/Production):** Observe the event bus for `UserEngagementEvent`s. Filter for `goalId: 'g61'` and `proofId: '100'`. Verify event volume and payload correctness.
*   **MarketingOS Ingestion Logs (Staging/Production):** Confirm that MarketingOS's ingestion logs show successful receipt and processing of `UserEngagementEvent`s with the specified `goalId` and `proofId`.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Unit Test Failure:** If `tests/services/user-goals.test.js` fails, particularly the new assertions for event emission.
*   **Mock Consumer Discrepancy:** If the `dev-mock-consumer.js` does not receive the event, or if the received event's `goalId` or `proofId` values are incorrect or missing.
*   **Event Bus Anomaly:** If event bus monitoring reveals no `UserEngagementEvent`s for `g61/100`, or if the events are malformed or have incorrect metadata.
*   **MarketingOS Ingestion Error:** If MarketingOS reports errors during ingestion of these specific events, or if downstream analytics indicate missing or incorrect data for "Goal 61" completion.