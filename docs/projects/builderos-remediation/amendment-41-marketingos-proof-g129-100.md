<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G129 100. -->

### AMENDMENT_41_MARKETINGOS Proof-Closing Blueprint Note: G129-100

**Signal:** This document — SSOT foundation.

**1. Exact Missing Implementation or Proof Gap:**
The core gap is the lack of a concrete, verifiable implementation and proof that MarketingOS data (e.g., customer segments, campaign performance metrics) is consistently synchronized with and served from the designated Single Source of Truth (SSOT) within LifeOS. Specifically, the proof that the `MarketingDataSyncService` correctly propagates updates and that the `MarketingOS_SSOT_API` endpoint reliably reflects this synchronized data is missing. The current blueprint outlines the *what* but not the *how* for this foundational SSOT mechanism.

**2. Smallest Safe Build Slice to Close It:**
Implement a minimal `MarketingDataSyncService` stub that performs a one-way synchronization of a single, representative data entity (e.g., `CustomerSegment` ID and name) from LifeOS core to a MarketingOS-facing data store (e.g., a dedicated `marketing_ssot_data` table or in-memory cache). Concurrently, expose a read-only `MarketingOS_SSOT_API` endpoint that serves this synchronized `CustomerSegment` data. The focus is on proving the *path*, *data consistency*, and *accessibility* for a single, critical data type.

**3. Exact Safe-Scope Files to Touch First:**
*   `services/marketing/MarketingDataSyncService.js`: New file for the synchronization logic.
*   `routes/marketing/ssot.js`: New file for the SSOT API endpoint definition.
*   `controllers/marketing/ssotController.js`: New file for the SSOT API endpoint handler.
*   `models/CustomerSegment.js`: Existing model (read-only access for sync source).
*   `models/MarketingSSOTSegment.js`: New model for the MarketingOS-facing synchronized data store.
*   `config/marketing.js`: Existing config (add sync interval, SSOT endpoint base path, data source configuration).
*   `tests/unit/MarketingDataSyncService.test.js`: New file for unit tests of the sync service.
*   `tests/integration/MarketingOS_SSOT_API.test.js`: New file for integration tests of the SSOT API.

**4. Verifier/Runtime Checks:**
*   **Unit Test:** `MarketingDataSyncService.test.js` verifies that `syncCustomerSegments` function correctly fetches data from `CustomerSegment` model and attempts to persist it to a mock `MarketingSSOTSegment` store.
*   **Integration Test:** `MarketingOS_SSOT_API.test.js` verifies that after a simulated sync, a GET request to `/api/marketing/ssot/customer-segments/{id}` returns the expected, synchronized `CustomerSegment` data.
*   **Runtime Log Check:** Monitor `MarketingDataSyncService` logs for successful sync operations and any errors (e.g., `INFO: CustomerSegment {id} synced successfully`).
*   **API Health Check:** Periodically query `/api/marketing/ssot/health` (if implemented as part of the slice) to ensure the SSOT API is responsive and reports its last sync time.
*   **Database Inspection:** Directly query the `marketing_ssot_data` table (or equivalent) to confirm data presence and accuracy after a sync cycle.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If `MarketingDataSyncService` consistently reports synchronization failures (e.g., data mismatch, connection errors, schema violations) for the test `CustomerSegment` entity.
*   If `MarketingOS_SSOT_API` consistently returns stale, incorrect, or incomplete data for the test `CustomerSegment` entity after a confirmed sync operation.
*   If the SSOT API endpoint is unreachable or returns non-200 status codes during integration tests or manual verification.
*   If the observed data in MarketingOS (via its own UI/API, if accessible) does not match the data served by `MarketingOS_SSOT_API` for the test entity, indicating a downstream integration failure or a fundamental SSOT breach.