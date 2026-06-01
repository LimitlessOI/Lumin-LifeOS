Amendment 41: MarketingOS Proof - G16-100 (User Goal Completion Event)
Proof-Closing Blueprint Note
This document serves as the SSOT foundation for closing the proof gap related to the `User.GoalCompletion` event for MarketingOS, as defined in `docs/projects/AMENDMENT_41_MARKETINGOS.md`.
1. Exact Missing Implementation or Proof Gap
The core LifeOS platform currently lacks the explicit event emission for `User.GoalCompletion` when a user successfully completes a defined goal. While the goal completion logic exists, the integration point to publish this critical signal to the internal `EventBus` for MarketingOS consumption is absent. Specifically, the `goalService` does not trigger an event with the necessary payload upon a goal's status transition to 'completed'.
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves modifying the existing `GoalService` to emit a `User.GoalCompletion` event. This includes:
-   Identifying the precise point within the `completeGoal` method (or equivalent) where a goal's status is confirmed as completed.
-   Constructing the event payload according to the schema outlined in `AMENDMENT_41_MARKETINGOS.md` (e.g., `userId`, `goalId`, `completionTimestamp`, `goalMetadata`).
-   Invoking the `EventBus.publish` method with the event type `User.GoalCompletion` and the constructed payload.
3. Exact Safe-Scope Files to Touch First
-   `src/services/goalService.js`: This file contains the core logic for managing and completing user goals. The event emission will be added here.
-   `src/events/eventDefinitions.js`: (If applicable) To ensure the `User.GoalCompletion` event type and its expected payload schema are formally defined and centralized.
-   `src/integrations/eventBus.js`: (If applicable) To ensure the `EventBus` interface is correctly imported and utilized.
4. Verifier/Runtime Checks
-   Unit Test (`goalService.test.js`): Mock the `EventBus` dependency. Call `goalService.completeGoal(userId, goalId)`. Assert that `EventBus.publish` was called exactly once with `eventType: 'User.GoalCompletion'` and a payload matching the specified schema (e.g., containing `userId`, `goalId`, `completionTimestamp`).
-   Integration Test (Staging Environment):
    1.  Create a test user.
    2.  Assign a trackable goal to the test user.
    3.  Perform actions that lead to the completion of the goal.
    4.  Monitor the internal event logging system (e.g., Kafka topic, SQS queue, or dedicated event dashboard) for the `User.GoalCompletion` event.
    5.  Verify the event's presence, its payload accuracy, and its timestamp.
    6.  (If MarketingOS integration is live in staging) Verify that MarketingOS receives and processes this event correctly, reflecting the goal completion for the test user.
-   Observability: Monitor `EventBus` metrics for `User.GoalCompletion` event counts and processing latency in production after deployment.
5. Stop Conditions if Runtime Truth Disagrees
-   If the `User.GoalCompletion` event is not emitted by `goalService.completeGoal()` during unit or integration tests.
-   If the emitted event's payload schema or data values do not precisely match the requirements specified in `AMENDMENT_41_MARKETINGOS.md`.
-   If the event is emitted but causes downstream errors or unexpected behavior in the `EventBus` or MarketingOS integration.
-   If the event is emitted but MarketingOS does not receive or correctly interpret it within the defined SLA.
-   If the event emission introduces significant performance degradation to the `goalService`.