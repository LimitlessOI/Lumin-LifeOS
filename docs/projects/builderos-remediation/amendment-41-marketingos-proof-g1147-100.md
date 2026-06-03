AMENDMENT 41 MARKETINGOS: Proof-Closing Blueprint Note (G1147-100)
This document serves as the SSOT foundation for closing the identified proof gap related to `user_segment` data synchronization with MarketingOS.
1. Exact Missing Implementation or Proof Gap
The current system lacks a formally defined, auditable, and consistently updated Single Source of Truth (SSOT) for `user_segment` data as consumed by MarketingOS. Specifically, there is no dedicated, event-driven mechanism to ensure that `user_segment` changes originating from the core LifeOS user profile service are reliably and immediately propagated to MarketingOS, leading to potential data staleness and inconsistencies in marketing targeting. The gap is the absence of a robust, real-time synchronization service that establishes LifeOS's user profile as the authoritative source for `user_segment`.
2. Smallest Safe Build Slice to Close It
Implement a new `UserSegmentSyncService` within the LifeOS platform. This service will subscribe to `user_segment_updated` events emitted by the core user profile service. Upon receiving an event, it will transform the relevant `*uid` and `user_segment` data into a standardized message format and publish it to a dedicated, asynchronous message queue (e.g., Kafka topic or RabbitMQ queue) specifically designated for MarketingOS consumption. This slice focuses solely on outbound synchronization from LifeOS to MarketingOS, without modifying MarketingOS's consumption logic or LifeOS's core user profile service.
3. Exact Safe-Scope Files to Touch First
-   `services/UserSegmentSyncService.js` (new file): Contains the core logic for event subscription, data transformation, and message publishing.
-   `config/marketingos.js` (new or existing): Add configuration for the MarketingOS-bound message queue/topic name and connection details.
-   `events/userProfileEvents.js` (existing): Verify or define the `user_segment_updated` event structure and ensure it's emitted correctly by the user profile service.
-   `package.json` (existing): Add necessary dependencies for the chosen message queue client (e.g., `kafkajs`, `amqplib`).
-   `index.js` or `app.js` (existing, LifeOS entry point): Register and initialize `UserSegmentSyncService`.
4. Verifier/Runtime Checks
1.  Service Startup: Confirm `UserSegmentSyncService` initializes and connects to both the event bus and the message queue without errors in LifeOS logs.
2.  Event Emission: Trigger a `user_segment` update for a known test user via LifeOS's user profile management interface.
3.  Message Publication: Monitor the MarketingOS-bound message queue/topic. Verify that a message containing the updated `*uid` and `user_segment` is published within expected latency.
4.  Message Content: Inspect the published message to ensure its format is correct and the `user_segment` data matches the update performed in step 2.
5.  MarketingOS Consumption (External Check): (Requires coordination with MarketingOS team) Confirm MarketingOS successfully consumes the message and updates its internal representation of the test user's `user_segment` without errors.
5. Stop Conditions if Runtime Truth Disagrees
-   `UserSegmentSyncService` fails to start, crashes repeatedly, or reports persistent connection errors to the event bus or message queue.
-   `user_segment_updated` events are not emitted by the user profile service when a segment change occurs, or the emitted events are malformed/missing critical data.
-   Messages are not published to the MarketingOS-bound queue/topic after a `user_segment` update event is observed.
-   Published messages are consistently malformed, contain incorrect `*uid` or `user_segment` data, or fail to adhere to the agreed-upon MarketingOS message schema.
-   MarketingOS reports consistent errors consuming messages from the queue, indicating a fundamental incompatibility or issue with the published data.