Command Center V2 Blueprint Proof: G20-100 - Core Data Ingestion (SystemStatus)
This document outlines the first proof-closing blueprint note for Command Center V2, focusing on the initial data ingestion pipeline as per the "Phased Rollout Strategy - Phase 1: Core Data Ingestion & Dashboard MVP".
---
Blueprint Note: Core Data Ingestion - SystemStatus Consumer
1.  Exact missing implementation or proof gap:
    The foundational data ingestion path for a core system event (`SystemStatus`) from Kafka to PgSQL is not yet implemented or proven. Specifically, the Kafka consumer service responsible for reading `SystemStatus` events from a dedicated topic and persisting them to the `system_status` PgSQL table is missing.
2.  Smallest safe build slice to close it:
    Implement a `SystemStatus` Kafka consumer service. This service will listen to the `system_status` Kafka topic, parse incoming messages as `SystemStatus` events, and store them in the `system_status` PgSQL table. This slice assumes the `system_status` table and topic already exist and are correctly configured. The focus is solely on the consumer logic, including robust error handling and retry mechanisms for database operations.
3.  Exact safe-scope files to touch first:
    *   `src/services/kafka/systemStatusConsumer.js`: New module for the Kafka consumer logic, including connection, message parsing, and dispatch to repository.
    *   `src/data/repositories/systemStatusRepository.js`: New module for database interaction (inserting `SystemStatus` records into `system_status` table).
    *   `src/types/systemStatus.js`: Define the expected structure/schema for `SystemStatus` events.
    *   `src/config/kafka.js`: Add configuration for `system_status` topic and consumer group.
    *   `src/app.js` or `src/index.js`: Modify to initialize and start the `systemStatusConsumer`.
    *   `tests/unit/services/kafka/systemStatusConsumer.test.js`: Unit tests for the consumer logic.
    *   `tests/integration/data/repositories/systemStatusRepository.test.js`: Integration tests for database persistence.
4.  Verifier/runtime checks:
    *   **Kafka Connectivity:** Verify the consumer successfully connects to the Kafka broker and subscribes to the `system_status` topic.
    *   **Message Consumption:** Confirm `SystemStatus` messages are being read from Kafka.
    *   **Data Persistence:** Validate that parsed `SystemStatus` events are correctly inserted into the `system_status` PgSQL table. This includes checking data types, nullability, and value ranges.
    *   **Error Handling:** Test scenarios for malformed Kafka messages, database connection failures, and unique constraint violations to ensure graceful degradation and logging.
    *   **Monitoring:** Observe consumer lag metrics to ensure it remains within acceptable bounds, indicating efficient processing.
    *   **End-to-End Flow:** Publish a known `SystemStatus` event to Kafka and verify its appearance in the PgSQL table within expected latency.
5.  Stop conditions if runtime truth disagrees:
    *   **Persistent Kafka Connection Failures:** If the consumer cannot maintain a stable connection to Kafka after configured retries.
    *   **Unrecoverable Message Parsing Errors:** If a significant percentage of messages fail parsing due to unexpected schema changes or corruption, indicating a fundamental mismatch.
    *   **Consistent Database Write Failures:** If the service repeatedly fails to write data to the `system_status` table, beyond transient network issues, suggesting schema mismatch, permissions, or database health problems.
    *   **Excessive Consumer Lag:** If consumer lag continuously grows, indicating the processing rate cannot keep up with the ingestion rate, potentially leading to data loss or stale data.
    *   **Data Integrity Violations:** If data observed in the `system_status` table consistently deviates from the expected structure or values from Kafka messages.