# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Gap G223-100

This document serves as the SSOT foundation for closing proof gap G223-100 related to Amendment 41, concerning MarketingOS integration.

## 1. Exact Missing Implementation or Proof Gap

The proof gap G223-100 is the lack of verified end-to-end transmission and correct payload formatting of the `UserEngagementEvent` from the LifeOS backend service to the MarketingOS API endpoint `/api/v1/marketingos/events`. While the event might be triggered internally, its successful external delivery and data integrity need explicit proof. Specifically, the current state lacks automated verification that the `UserEngagementEvent` is correctly serialized and sent via HTTP POST to the designated MarketingOS endpoint with the expected structure and content.

## 2. Smallest Safe Build Slice to Close It

Implement a dedicated integration test suite that simulates a user action within LifeOS, triggers the `UserEngagementEvent`, intercepts the outgoing HTTP request to MarketingOS, and asserts its structure, content, and successful transmission. This slice focuses purely on verification without altering core application logic, ensuring the existing event emission and sending mechanisms function as intended for MarketingOS.

## 3. Exact Safe-Scope Files to Touch First

*   `tests/integration/marketingos/userEngagementEvent.test.js` (new file)
*   `src/services/marketingos/eventSender.js` (review for testability, potentially add mockable interface if not already present)
*   `package.json` (to add testing dependencies like `nock` or `jest-fetch-mock` if not already available for HTTP mocking)

## 4. Verifier/Runtime Checks

The following checks will be implemented as part of the integration test suite:

*   **Test Case 1: Event Trigger & Payload Generation:**
    *   Simulate a user completing a core action (e.g., `lifeos.core.task.completed`) that is expected to emit a `UserEngagementEvent`.
    *   Assert that the `eventSender.js`'s `sendEvent` method is invoked with a `UserEngagementEvent` payload.
    *   Assert the payload contains mandatory fields: `userId` (string), `eventType: 'UserEngagementEvent'` (string), `timestamp` (ISO 8601 string), and a `details` object (object) containing relevant action data (e.g., `actionId`, `actionType`).
*   **Test Case 2: API Call & Status:**
    *   Mock the MarketingOS API endpoint `/api/v1/marketingos/events` to return a `200 OK` status upon receiving a POST request.
    *   Assert that an HTTP POST request is made to `https://marketingos.example.com/api/v1/marketingos/events` (or the configured MarketingOS base URL).
    *   Assert the request body sent to the mocked endpoint exactly matches the expected `UserEngagementEvent` payload generated in Test Case 1.
    *   Assert the request includes necessary authentication headers (e.g., `Authorization: Bearer <token>`).
*   **Test Case 3: Error Handling:**
    *   Mock the MarketingOS API endpoint to return a `500 Internal Server Error` or `400 Bad Request`.
    *   Assert that the `eventSender.js` handles the error gracefully (e.g., logs an error, potentially triggers a retry mechanism if configured, and does not cause an unhandled exception or application crash).

## 5. Stop Conditions if Runtime Truth Disagrees

The build pass will be stopped