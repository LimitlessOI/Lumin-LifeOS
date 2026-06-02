Command Center V2 Blueprint Proof: g311-100 Follow-Through

Blueprint Note: Timeseries DB Integration for System Health Metrics

This note closes the proof for the initial data ingestion core and derives the next smallest build slice, focusing on establishing the persistence layer for `system_health_metrics`.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a dedicated persistence layer for `system_health_metrics`. This includes the database schema definition and the initial data access object (DAO) for storing and retrieving these metrics.

### 2. Smallest Safe Build Slice to Close It

Define the `system_health_metrics` table schema and implement a basic `insertMetric` function within a new repository. This slice focuses solely on the foundational persistence, without complex query patterns or aggregation logic.

### 3. Exact Safe-Scope Files to Touch First

*   `db/migrations/001_create_system_health_metrics_table.sql`: SQL script to define the `system_health_metrics` table.
*   `src/data/systemHealthMetricsRepository.js`: New module containing functions for interacting with the `system_health_metrics` table (e.g., `insertMetric`).
*   `src/services/systemHealthService.