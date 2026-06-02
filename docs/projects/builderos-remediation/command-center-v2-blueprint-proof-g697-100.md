# Blueprint Proof: Command Center V2 - Data Stream Ingestion (g697-100)

This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, focusing on the foundational step of data stream integration as outlined in `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`, specifically Phase 1.1.

---

## Blueprint Note: Data Stream Ingestion Proof

**1. Exact Missing Implementation or Proof Gap:**
The blueprint specifies "1.1 Data Source Integration: Connect to existing LifeOS data streams (e.g., `metrics`, `events`)". The current gap is the concrete implementation of a service capable of connecting to and consuming data from at least one designated LifeOS data stream, and proving its operational readiness. This involves setting up a consumer for a specific stream and verifying its ability to receive and process messages.

**2. Smallest Safe Build Slice to Close It:**
Implement a minimal, standalone Node.js service that acts as a Kafka consumer for the `lifeos.metrics` topic. This service will connect to the configured Kafka broker, subscribe to the topic, and log each received message to standard output. This slice focuses solely on establishing connectivity and message reception, without introducing storage, processing, or API layers.

**3. Exact Safe-Scope Files to Touch First:**
*   `services/data-ingestion/metricStreamConsumer.js`: New file for the Kafka consumer logic.
*   `config/kafka.js`: New file for Kafka broker configuration (e.g., `KAFKA_BROKER_LIST`, `KAFKA_GROUP_ID`).
*   `package.json`: Add `kafkajs` dependency.
*   `tests/services/data-ingestion/metricStreamConsumer.test.js`: New file for unit/integration tests for the consumer.
*   `.env.example`: Add example environment variables for Kafka configuration.

**4. Verifier/Runtime Checks:**
*   **Service Startup:** Ensure `metricStreamConsumer.js` starts without errors and logs successful connection to the Kafka broker.
*   **Message Reception:** Verify that the service logs incoming messages from the `lifeos.metrics` topic. Messages should appear consistently if the stream is active.
*   **Error Handling:** Introduce a test message with an invalid format (if applicable) to ensure the consumer handles parsing errors gracefully without crashing.
*   **Resource Usage:** Monitor CPU and memory usage of the consumer process to ensure it remains within expected bounds for a simple listener.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   **Connection Failure:** If the consumer fails to connect to the Kafka broker after configured retries.
*   **No Messages:** If the consumer connects successfully but receives no messages from the `lifeos.metrics` topic for an extended period (e.g., 5 minutes) while the stream is known to be active.
*   **Service Crash:** If the consumer process crashes unexpectedly due to unhandled exceptions or resource exhaustion.
*   **Excessive Resource Use:** If the consumer's CPU or memory usage significantly exceeds baseline expectations for a passive listener, indicating a potential leak or inefficient processing.
*   **Data Integrity Issues:** If logged messages show consistent corruption or unexpected formats, indicating a problem with the stream or consumer's deserialization.