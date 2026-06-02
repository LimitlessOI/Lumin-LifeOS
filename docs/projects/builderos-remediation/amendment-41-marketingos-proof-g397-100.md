# Proof-Closing Blueprint Note: Amendment 41 - MarketingOS Proof G397-100

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

This note outlines the necessary steps to close the proof gap for Amendment 41, ensuring the MarketingOS integration functions as the Single Source of Truth (SSOT) foundation dictates.

---

### 1. Exact Missing Implementation or Proof Gap

The proof gap is the lack of verified end-to-end signal flow for user engagement events from the LifeOS `EngagementService` to a verifiable consumer, confirming adherence to the event schema and emission points defined in `AMENDMENT_41_MARKETINGOS.md`. Specifically, we need to prove that `EngagementService` correctly emits `post_view` and `profile_update` events to the `marketingos.engagement.events` Kafka topic with the specified data structure.

### 2. Smallest Safe Build Slice to Close It

A dedicated integration test suite will be implemented. This suite will:
    a. Establish a connection to a local or test Kafka instance.
    b. Programmatically trigger the `EngagementService` to emit a `post_view` event and a `profile_update` event.
    c. Consume messages from the `marketingos.engagement.events` Kafka topic.
    d. Assert the content, structure, and count of the consumed messages against the specification in `AMENDMENT_41_MARKETINGOS.md`.

### 3. Exact Safe-Scope Files to Touch First

*   `tests/integration/marketingos/engagement-events.test.js` (new file)
*   `package.json` (to add `kafkajs` or similar Kafka client library as a `devDependency` if not already present for testing purposes).
*   `src/services/EngagementService.js` (review for testability hooks, *no core logic modification*).

### 4. Verifier/Runtime Checks

Execute the new integration test suite: `npm test tests/integration/marketingos/engagement-events.test.js`.
The test suite must pass, asserting the following:
*   A successful connection to the Kafka topic `marketingos.engagement.events` is established.
*   Exactly two distinct messages are consumed from the topic within a defined timeout.
*   One consumed message has `eventType: 'post_view'`.
*   The other consumed message has `eventType: 'profile_update'`.
*   Both messages contain the expected top-level keys: `userId`, `eventType`, `timestamp`, and `payload`.
*   The `payload` structure for each event type conforms to the schema defined in `AMENDMENT_41_MARKETINGOS.md`.
*   The `userId` in the consumed messages matches the user ID used to trigger the events.

### 5. Stop Conditions If Runtime Truth Disagrees

The proof is considered failed and requires further investigation if any of the following occur:
*   The integration test suite fails (e.g., assertion error, Kafka connection error, timeout waiting for messages).
*   No messages are consumed from `marketingos.engagement.events` within the specified timeout after triggering the events.
*   Messages are consumed, but their count, `eventType`, or overall schema/content do not precisely match the expectations derived from `AMENDMENT_41_MARKETINGOS.md`.
*   The Kafka topic `marketingos.engagement.events` is not found or is inaccessible during the test run.