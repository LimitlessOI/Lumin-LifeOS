### Proof-Closing Blueprint Note: MarketingOS SSOT Foundation - Gap G103-100

**1. Exact Missing Implementation or Proof Gap:**
The current MarketingOS data ingestion pipeline lacks a formal, auditable mechanism to verify the integrity and completeness of data sourced from the designated Single Source of Truth (SSOT) for customer profiles and campaign metadata. Specifically, there is no automated proof that the data consumed by MarketingOS accurately reflects the SSOT at the point of ingestion, leading to potential discrepancies in campaign targeting and reporting. Gap G103-100 refers to the absence of a cryptographic hash or checksum verification step for SSOT data batches upon receipt and before processing.

**2. Smallest Safe Build Slice to Close It:**
Implement a data integrity verification layer within the existing MarketingOS data ingestion service. This slice will focus on adding a post-ingestion validation step that computes and compares a hash of the received SSOT data payload against a hash provided by the SSOT source (or computed locally and logged for audit). This is a read-only verification step that does not alter existing data or processing logic, only adds a check.

**3. Exact Safe-Scope Files to Touch First:**
*   `services/marketingos/src/data-ingestion/ssot-consumer.js`
*   `services/marketingos/src/data-ingestion/data-integrity-verifier.js` (new module)
*   `services/marketingos/tests/unit/data-ingestion/data-integrity-verifier.test.js` (new test file)

**4. Verifier/Runtime Checks:**
*   **Unit Tests:** Verify that the `data-integrity-verifier` module correctly computes hashes for various data payloads and accurately identifies mismatches.
*   **Integration Tests:** Simulate SSOT data ingestion with both valid and corrupted (tampered hash) payloads, ensuring the system logs verification success/failure appropriately without halting core processing.
*   **Runtime Logging:** Monitor logs for `SSOT_DATA_INTEGRITY_VERIFICATION_SUCCESS` and `SSOT_DATA_INTEGRITY_VERIFICATION_FAILURE` events.
*   **Metrics:** Introduce a metric `marketingos.ssot_ingestion.integrity_check_failures_total` to track discrepancies.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If the `marketingos.ssot_ingestion.integrity_check_failures_total` metric exceeds a predefined threshold (e.g., 0.1% of ingested batches) within a 24-hour period, indicating systemic data corruption or source issues.
*   If critical campaign launches or reporting processes are observed to be using demonstrably incorrect or incomplete data, and logs indicate successful SSOT data ingestion without integrity failures (suggesting the verification itself is flawed).
*   If the SSOT source system's provided hash/checksum mechanism changes without prior coordination, rendering the current verification logic incompatible.