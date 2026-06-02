### Proof-Closing Blueprint Note: MarketingOS SSOT Foundation (G333-100)

**1. Exact Missing Implementation or Proof Gap:**
The core gap is the verifiable establishment of `CustomerEngagementEvents` as the Single Source of Truth (SSOT) for customer engagement metrics within MarketingOS. Specifically, proving that:
    a. `CustomerEngagementEvents` are correctly ingested, transformed, and validated against the canonical SSOT schema.
    b. The transformed data is stored in the designated SSOT data store (`marketingos_ssot.customer_engagement_metrics`).
    c. A read-only verification endpoint confirms the presence, freshness, and schema conformance of this SSOT data.
    d. Data consistency and freshness guarantees are met, ensuring the SSOT is reliable for downstream consumption.

**2. Smallest Safe Build Slice to Close It:**
Implement a dedicated `CustomerEngagementEvent` data ingestion, transformation, and SSOT persistence pipeline, along with a verification endpoint. This slice focuses on:
    a. Creating a minimal event listener/consumer for `CustomerEngagementEvents` from the designated message queue.
    b. Implementing a lightweight transformation layer to conform event data to the `CustomerEngagementEventSSOT` schema.
    c. Persisting the transformed and validated data into the `marketingos_ssot.customer_engagement_metrics` table/collection.
    d. Developing a read-only `/api/v1/marketingos/ssot/customer-engagement-metrics/status` endpoint to expose SSOT data availability, freshness, and a sample of recent records for verification.
    e. Basic health checks for the ingestion pipeline components.

**3. Exact Safe-Scope Files to Touch First:**
*   `services/marketingos/src/data/customerEngagementEvents/ingestService.js`: New service for consuming raw events.
*   `services/marketingos/src/data/customerEngagementEvents/transformer.js`: New module for data transformation to SSOT schema.
*   `services/marketingos/src/data/customerEngagementEvents/repository.js`: New module for persisting transformed data to `marketingos_ssot.customer_engagement_metrics`.
*   `services/marketingos/src/api/v1/marketingos/ssot/customerEngagementMetrics/statusController.js`: New controller for the SSOT verification endpoint.
*   `services/marketingos/src/api/v1/marketingos/ssot/customerEngagementMetrics/routes.js`: New route definition for the verification endpoint.
*   `services/marketingos/src/data/schemas/customerEngagementEventSSOT.js`: New schema definition for the canonical SSOT data structure.
*   `services/marketingos/tests/integration/customerEngagementEvents/ssotIngestion.test.js`: New integration tests for the ingestion pipeline and SSOT verification endpoint.

**4. Verifier/Runtime Checks:**
*   **Ingestion Latency Check:** Monitor the time from event source emission to availability in `marketingos_ssot.customer_engagement_metrics`. Expected: < 2 seconds.
*   **Data Integrity Check:** Compare a sample of ingested events against the SSOT store to ensure no data loss or corruption. Verify `event_id` uniqueness.
*   **Schema Conformance Check:** Validate transformed data against `customerEngagementEventSSOT.js` schema upon persistence.
*   **SSOT Endpoint Verification:** Query `/api/v1/marketingos/ssot/customer-engagement-metrics/status` to confirm data availability, freshness timestamp, and a sample of recent records.
*   **Throughput Verification:** Monitor the rate of events processed and persisted to SSOT, matching expected source volume.

**5.