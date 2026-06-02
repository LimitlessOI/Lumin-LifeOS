The current MarketingOS integration lacks a dedicated, auditable reconciliation service to verify that key marketing campaign performance metrics and customer segment data, as reported by MarketingOS, are consistently sourced from or accurately reflect the LifeOS Single Source of Truth (SSOT). Specifically, there is no automated mechanism to cross-reference MarketingOS reported aggregates (e.g., total users in a segment, campaign conversion rates) against the raw, canonical data within LifeOS's core user and event stores. This gap prevents a robust "proof" of data integrity and SSOT adherence for MarketingOS operations.

**2. Smallest Safe Build Slice to Close It**
Implement a new `MarketingOSDataReconciler` service. This service will operate as a scheduled job, performing daily reconciliation checks for a defined set of critical MarketingOS metrics and segments against LifeOS SSOT data. Its initial scope will focus on verifying the count of users within a specific MarketingOS-defined segment against the corresponding user count derived directly from LifeOS's `User` and `SegmentMembership` tables. The service will log discrepancies and report reconciliation status.

**3. Exact Safe-Scope Files to Touch First**
*   `services/marketingos-reconciler/src/index.js` (new service entry point)
*   `services/marketingos-reconciler/src/reconciliationJob.js` (core reconciliation logic)
*   `services/marketingos-reconciler/src/config.js` (configuration for segments/metrics to check)
*   `services/marketingos-reconciler/package.json` (new service dependencies)
*   `services/marketingos-reconciler/Dockerfile` (for deployment)
*   `k8s/deployments/marketingos-reconciler.yaml` (Kubernetes deployment definition)
*   `tests/services/marketingos-reconciler/reconciliationJob.test.js` (unit/integration tests)

**4. Verifier/Runtime Checks**
*   **Log Monitoring:** Verify that `MarketingOSDataReconciler` service logs indicate successful daily runs and report "0 discrepancies found" for the initial target segment.
*   **Metric Exposure:** Confirm that a new metric `marketingos_reconciliation_discrepancies_total` is exposed (e.g., via Prometheus) and consistently reports 0.
*   **Database Audit (Manual):** Manually query LifeOS `User` and `SegmentMembership` tables to confirm the count for the target segment matches the count reported by MarketingOS for a given day, cross-referencing with the reconciler's logs.
*   **