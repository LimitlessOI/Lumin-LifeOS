# Command Center V2 Blueprint Proof: G20-100 - Core Data Ingestion (SystemStatus)

This document outlines the first proof-closing blueprint note for Command Center V2, focusing on the initial data ingestion pipeline as per the "Phased Rollout Strategy - Phase 1: Core Data Ingestion & Dashboard MVP".

---

**Blueprint Note: Core Data Ingestion - SystemStatus Consumer**

1.  **Exact missing implementation or proof gap:**
    The foundational data ingestion path for a core system event (`SystemStatus`) from Kafka to PostgreSQL is not yet implemented or proven. Specifically, the Kafka consumer service responsible for reading `SystemStatus` events from a dedicated topic and persisting them to the `system_status` PostgreSQL table is missing.

2.  **Smallest safe build slice to close it:**
    Implement a `SystemStatus` Kafka consumer service. This service will listen to the `system_status` Kafka topic, parse incoming messages as `SystemStatus` events, and store them in the `system_status` PostgreSQL table. This slice assumes the `system_status` table and topic