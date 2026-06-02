Proof-Closing Blueprint Note: MarketingOS Integration Gap G49-100
This document serves as the Single Source of Truth (SSOT) foundation for closing the identified proof gap G49-100 related to Amendment 41 (MarketingOS Integration).
1. Exact Missing Implementation or Proof Gap
The current implementation lacks a robust, real-time synchronization mechanism for critical `User` entity attributes, specifically `user.lifecycleStatus`, from LifeOS to MarketingOS. This results in stale or inconsistent user segmentation data within MarketingOS, impacting campaign targeting accuracy. Proof G49-100 specifically targets the reliable propagation and reflection of `user.lifecycleStatus` changes.
2. Smallest Safe Build Slice to Close It
Implement an event-driven propagation mechanism for `user.lifecycleStatus` changes. This involves:
1.  Modifying the LifeOS `UserService` to emit a structured event (`UserLifecycleStatusChangedEvent`) whenever `user.lifecycleStatus` is updated.
2.  Introducing a new LifeOS integration module responsible for publishing these events to a dedicated, durable message queue (e.g., Kafka topic `lifeos.user.lifecycle.events`).
3.  (Conceptual, for full integration proof) A MarketingOS consumer service that subscribes to `lifeos.user.lifecycle.events` and updates its internal user profiles accordingly. This blueprint focuses on the LifeOS side of the propagation.
3. Exact Safe-Scope Files to Touch First
-   `src/services/userService.js`: Modify `updateUserLifecycleStatus` method to emit `UserLifecycleStatusChangedEvent`.
-   `src/events/userLifecycleEvents.js`: Define `UserLifecycleStatusChangedEvent` schema.
-   `src/integrations/marketingOSPublisher.js`: New file. Implement a module to connect to the message queue and publish `UserLifecycleStatusChangedEvent` instances.
-   `src/index.js` (or relevant entry point): Initialize `marketingOSPublisher`.
-   `src/config/eventBus.js`: Add configuration for the new event topic.
4. Verifier/Runtime Checks
1.  Unit Test (`userService.js`): Verify that calling `updateUserLifecycleStatus` correctly emits a `UserLifecycleStatusChangedEvent` with the expected payload.
2.  Integration Test (`marketingOSPublisher.js`): Simulate a `UserLifecycleStatusChangedEvent` and verify it is successfully published to the configured message queue topic.
3.  End-to-End Test (Manual/Automated):
-   Change a `user.lifecycleStatus` for a test user in LifeOS.
-   Monitor the `lifeos.user.lifecycle.events` message queue to confirm the event's presence and correct payload.
-   (Requires MarketingOS access) Verify the corresponding user profile in MarketingOS reflects the updated `lifecycleStatus` within 5 seconds.
5. Stop Conditions if Runtime Truth Disagrees
-   `UserLifecycleStatusChangedEvent` is not emitted by `userService.js` upon status change.
-   `UserLifecycleStatusChangedEvent` is emitted but not published to the `lifeos.user.lifecycle.events` topic by `marketingOSPublisher.js`.
-   The published event's payload is malformed or missing critical data (e.g., `userId`, `oldStatus`, `newStatus`, `timestamp`).
-   The event is published but not consumed by MarketingOS within the defined SLA (e.g., 5 seconds), indicating a downstream integration failure.
-   MarketingOS user profile is updated with incorrect `lifecycleStatus` or not updated at all.