# Blueprint Proof Note: Command Center V2 - Slice 1.1 Data Ingestion Service (MVP) - Proof G121-100

This document serves as a proof-closing note for the initial build slice of the Command Center V2 project, specifically targeting the Data Ingestion Service MVP.

---

## Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The `command-center-v2-data-ingestion-service` is not yet implemented. The proof gap is the absence of a functional service instance capable of consuming raw event messages from the `lifeos.events.raw` Kafka topic and persisting them to a temporary staging area.

**2. Smallest Safe Build Slice to Close It:**
Implement the `command-center-v2-data-ingestion-service`. This slice will focus on:
    a. Initializing a Kafka consumer configured for the `lifeos.events.raw` topic.
    b. Receiving messages from this topic.
    c. Writing each received message (raw payload) to a local file-system-based staging directory.
    d. Basic error handling for Kafka connection and file writing.
This slice explicitly excludes any data transformation, aggregation, or database interaction, focusing solely on reliable ingestion and temporary storage.

**3. Exact Safe-Scope Files to Touch First:**
-   `services/command-center-v2-data-ingestion-service/package.json` (Initialize project, add `kafkajs` and other necessary dependencies)
-   `services/command-center-v2-data-ingestion-service/.env.example` (Define `KAFKA_BROKERS`, `KAFKA_TOPIC_RAW_EVENTS`, `STAGING_PATH`)
-   `services/command-center-v2-data-ingestion-service/src/index.ts` (Main service entry point, orchestrates consumer and writer)
-   `services/command-center-v2-data-ingestion-service/src/kafkaConsumer.ts` (Module for Kafka consumer setup