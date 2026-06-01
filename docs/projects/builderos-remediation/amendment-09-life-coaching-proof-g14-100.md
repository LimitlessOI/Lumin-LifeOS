### Proof-Closing Blueprint Note: Amendment 09 - Life Coaching (Proof G14-100)

This note addresses the proof gap G14-100 related to Amendment 09, focusing on ensuring the foundational data integrity for life coaching interactions.

1.  **Exact missing implementation or proof gap:**
    The current system lacks a verifiable mechanism to confirm and persist the completion status of a scheduled life coaching session for a user. Specifically, there is no explicit data point or event log that reliably marks a session as "completed" and links it to a user and a specific coaching plan, which is crucial for accurate progress tracking, reporting, and potential billing.

2.  **Smallest safe build slice to close it:**
    Implement a `markSessionCompleted` service function within the coaching domain that updates the status of a `UserCoachingSession` record to `COMPLETED` and emits a corresponding `SESSION_COMPLETED` event. This function will be designed for internal system calls (e.g., from a coach portal backend or an automated session management service) and will include basic authorization checks.

3.  **Exact safe-scope files to touch first:**
    *   `src/services/coachingService.js`: Add the `markSessionCompleted` asynchronous function.
    *   `src/models/UserCoachingSession.js`: Ensure the `status` field in the `UserCoachingSession` schema/model supports a `COMPLETED` enum value.
    *   `src/events/coachingEvents.js`: Define a new `SESSION_COMPLETED` event constant and its payload structure.
    *   `src/utils/eventEmitter.js`: Utilize the existing platform event emitter to dispatch the `SESSION_COMPLETED` event.

4.  **Verifier/runtime checks:**
    *   **Unit Test (`coachingService.test.js`):** Verify that `markSessionCompleted` successfully updates a `UserCoachingSession` record's status to `COMPLETED` in the mock database and that a `SESSION_COMPLETED` event is emitted with the correct payload.
    *   **Integration Test (`coachingFlow.test.js`):** Simulate an authorized call to `markSessionCompleted` via a mock API endpoint. Assert that the database reflects the `COMPLETED` status for the session and that the `SESSION_COMPLETED` event is observable by a mock listener.
    *   **Runtime Check:** After a simulated session completion, query the `UserCoachingSession` collection/table directly for the affected session ID. The `status` field must be `COMPLETED`. Monitor system logs for the `SESSION_COMPLETED` event.

5.  **Stop conditions if runtime truth disagrees:**
    *   If `markSessionCompleted` fails to update the `UserCoachingSession` record's status to `COMPLETED` in the database.
    *   If no `SESSION_COMPLETED` event is emitted or logged upon successful status update.
    *   If the updated status is not immediately and consistently reflected in subsequent database reads.
    *   If unauthorized attempts to call `markSessionCompleted` are not properly rejected with an appropriate error.