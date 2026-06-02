# Amendment 41: MarketingOS Proof G289-100 - SSOT Foundation Proof-Closing Blueprint Note

This document outlines the blueprint for closing the proof gap for MarketingOS Proof G289-100, establishing the Single Source of Truth (SSOT) foundation as per Amendment 41.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the lack of a robust, automated verification mechanism to confirm that critical marketing campaign performance metrics (specifically those defined by G289-100, e.g., `campaign_impressions`, `campaign_clicks`, `campaign_conversions`) are consistently and accurately reflected in the designated MarketingOS SSOT data store, matching their originating source systems (e.g., AdPlatform A, AdPlatform B). The current state lacks continuous, programmatic reconciliation and discrepancy reporting for these specific metrics.

## 2. Smallest Safe Build Slice to Close It

Implement a dedicated `SSOTDataReconciliationService` that focuses solely on the G289-100 metrics. This service will:
1.  Fetch `campaign_impressions`, `campaign_clicks`, and `campaign_conversions` for active campaigns from the MarketingOS SSOT.
2.  Fetch the same metrics for the same campaigns from their respective primary source systems (e.g., `AdPlatformAIntegrationService`, `AdPlatformBIntegrationService`).
3.  Perform a direct comparison of these metrics, allowing for a predefined, configurable tolerance threshold (e.g., 0.1% variance).
4.  Log any discrepancies exceeding the tolerance.
5.  Expose an endpoint or a scheduled job to trigger this reconciliation.

This slice avoids modifying existing data ingestion pipelines or core SSOT storage logic, focusing purely on validation and reporting.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketing/SSOTDataReconciliationService.js`: New service file containing the core reconciliation logic.
*   `src/services/marketing/SSOTDataReconciliationService.test.js`: New test file for the reconciliation service.
*   `src/routes/admin/marketing/ssot-reconciliation.js`: New admin route to manually trigger the reconciliation (optional, for initial testing/debugging).
*   `src/config/marketing.js`: Add a new configuration entry for `G289_100_METRIC_TOLERANCE_PERCENT` and `G289_100_METRICS_TO_RECONCILE`.
*   `src/jobs/marketing/reconcileG289Metrics.js`: New scheduled job file to run the reconciliation service periodically.

## 4. Verifier/Runtime Checks

*   **Automated Daily Reconciliation Job:** The `reconcileG289Metrics` job runs daily at a specified off-peak hour.
*   **Discrepancy Logging:** All detected discrepancies (metric, campaign ID, source value, SSOT value, difference, timestamp) are logged to a dedicated `marketing_ssot_discrepancies` table or a structured log sink.
*   **Alerting Integration:** Integration with the existing alerting system to trigger high-priority alerts for discrepancies exceeding a critical threshold (e.g., >5% variance) for more than 3 consecutive runs.
*   **Dashboard Metric:** A new metric exposed via Prometheus/Grafana showing "G289-100 SSOT Discrepancy Count (Last 24h)" and "Max G289-100 Metric Variance (Last 24h)".

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Persistent Unexplained Discrepancies:** If the `SSOTDataReconciliationService` consistently reports discrepancies for G289-100 metrics that cannot be attributed to known data latency or expected processing windows, and these discrepancies persist for more than 72 hours across multiple campaigns, the proof is considered failed.
*   **Reconciliation Service Failure:** If the `SSOTDataReconciliationService` itself fails to execute or complete its checks for more than 24 hours due to internal errors, indicating a breakdown in the verification mechanism.
*   **Performance Impact:** If running the reconciliation service significantly degrades the performance of core MarketingOS data ingestion or query services (e.g., >10% increase in average latency for critical paths), indicating the current approach is not scalable.
*   **Data Lineage Breakdown:** If, during investigation of a discrepancy, the data lineage for G289-100 metrics from source to SSOT cannot be clearly traced and validated, indicating a fundamental issue with the SSOT foundation.