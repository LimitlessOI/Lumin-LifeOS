# AMENDMENT 41: MarketingOS SSOT Foundation Proof - G681-100

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

## Proof-Closing Blueprint Note

This note outlines the necessary steps to close the proof gap for establishing the Single Source of Truth (SSOT) foundation for MarketingOS, as specified in Amendment 41.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the lack of a robust, verifiable mechanism to ingest and synchronize `MarketingCampaign` and `CustomerSegment` data from the designated external Marketing Automation Platform (MAP) and definitively establish it as the SSOT within the LifeOS platform for consumption by MarketingOS features. Specifically, the proof requires demonstrating:
*   Successful, idempotent data ingestion from the MAP.
*   Correct persistence of this data into the LifeOS database.
*   A clear indicator (e.g., `is_ssot_source`, `last_sync_timestamp`) on the ingested entities confirming their SSOT status.
*   Basic conflict resolution strategy for updates (e.g., MAP data always overrides LifeOS-originated data for SSOT fields).

### 2. Smallest Safe Build Slice to Close It

Implement a dedicated `MarketingOSIngestionService` responsible for:
1.  Defining a minimal data contract (schema) for `MarketingCampaign` and `CustomerSegment` entities as expected from the MAP.
2.  Creating a new internal API endpoint (e.g., `/api/v1/marketingos/ingest/campaigns`, `/api/v1/marketingos/ingest/segments`) or a scheduled worker that can receive/pull this data.
3.  Performing basic schema validation on incoming data.
4.  Upserting the validated data into new or existing `MarketingCampaign` and `CustomerSegment` database tables, ensuring the `is_ssot_source` flag is set to `true` and `last_sync_timestamp` is updated.
5.  Implementing a basic "last-write-wins" or "source-of-truth-wins" conflict resolution for key fields where the MAP is the SSOT.

This slice focuses solely on the ingestion and SSOT marking, not on downstream consumption or complex business logic.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketing/MarketingOSIngestionService.js` (New file)
*   `src/routes/marketing/ingestionRoutes.js` (New file, if API endpoint)
*   `src/models/MarketingCampaign.js` (Extend/Modify for SSOT fields)
*   `src/models/CustomerSegment.js` (Extend/Modify for SSOT fields)
*   `src/database/migrations/YYYYMMDDHHMMSS_add_marketingos_ssot_fields.js` (New migration file)
*   `src/workers/marketing/MarketingOSSyncWorker.js` (New file, if worker-based ingestion)

### 4. Verifier/Runtime Checks

1.  **API/Worker Invocation:** Trigger the ingestion endpoint/worker with sample `MarketingCampaign` and `CustomerSegment` data from the MAP.
2.  **Database Persistence:** Query the `MarketingCampaign` and `CustomerSegment` tables directly to verify:
    *   New records are created with the ingested data.
    *   Existing records are updated correctly.
    *   The `is_ssot_source` field is `true` for MAP-originated data.
    *   The `last_sync_timestamp` is updated.
    *   Data integrity (e.g., required fields, data types) is maintained.
3.  **Idempotency Check:** Re-run the ingestion with the same data; verify no duplicate records are created and updates are consistent.
4.  **Conflict Resolution:** Ingest data that conflicts with existing non-SSOT data in LifeOS; verify the MAP data correctly overrides.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Data Loss/Corruption:** If ingested data is incomplete, malformed, or corrupts existing valid data.
*   **Inconsistent SSOT Flagging:** If `is_ssot_source` is not correctly set or updated, leading to ambiguity about the data's origin and authority.
*   **Failed Idempotency:** If repeated ingestion of the same data leads to duplicate records or inconsistent state.
*   **Performance Degradation:** If the ingestion process significantly impacts system performance (e.g., high CPU, memory, or database load) beyond acceptable thresholds.
*   **Unresolved Conflicts:** If the defined conflict resolution strategy fails to correctly apply MAP data as the SSOT, leading to data discrepancies.