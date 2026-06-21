<!-- SYNOPSIS: Amendment 41: MarketingOS Proof-G20-100 - Proof-Closing Blueprint Note -->

# Amendment 41: MarketingOS Proof-G20-100 - Proof-Closing Blueprint Note

This document serves as the SSOT foundation for closing the initial proof-of-concept for MarketingOS integration, specifically targeting `Proof-G20-100` as outlined in `docs/projects/AMENDMENT_41_MARKETINGOS.md`. It details the necessary steps to establish and verify the foundational data synchronization and event propagation mechanisms.

---

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the concrete implementation and end-to-end verification of the `UserActivityStream` Kafka topic and a basic `MarketingOSDataSyncService` listener. This includes:
-   Definition of the `UserActivityEvent` schema.
-   Implementation of a minimal `UserActivityProducer` to publish events to the stream.
-   Implementation of the `MarketingOSDataSyncConsumer` to subscribe to `UserActivityStream` and log received events, demonstrating successful data flow.

### 2. Smallest Safe Build Slice to Close It

To close this proof gap, the following minimal components are required:
-   **Schema Definition:** A clear, versioned schema for `UserActivityEvent`.
-   **Producer Implementation:** A standalone utility or a minimal integration point within an existing service to generate and publish `UserActivityEvent`