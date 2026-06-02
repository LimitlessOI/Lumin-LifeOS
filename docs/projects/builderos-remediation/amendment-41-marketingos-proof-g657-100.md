AMENDMENT 41: MarketingOS Proof (G657-100) - Proof-Closing Blueprint Note
This document serves as the SSOT foundation for closing the proof gap identified in AMENDMENT_41_MARKETINGOS.md, focusing on the verification of MarketingOS data integration within LifeOS.
---
1. Exact Missing Implementation or Proof Gap:
The primary gap is the lack of an automated, internal-only verification mechanism to confirm the successful ingestion, processing, and correct application of MarketingOS-derived user segment data within LifeOS's internal data stores. Specifically, there is no continuous runtime check ensuring that users are correctly assigned to MarketingOS segments as per the MarketingOS source of truth.
2. Smallest Safe Build Slice to Close It:
Implement a new, lightweight, internal `MarketingOSSegmentVerifier` service. This service will periodically sample a small, predefined set of LifeOS user profiles, query their currently assigned MarketingOS segments within LifeOS, and compare these assignments against a known, static (for initial proof) or internally accessible dynamic MarketingOS segment definition. Discrepancies will be logged to an internal monitoring system without affecting user-facing functionality.
3. Exact Safe-Scope Files to Touch First:
-   `services/marketing-os-verifier/index.js` (New service implementation)
-   `services/marketing-os-verifier/package.json` (Dependencies for the new service)
-   `config/internal-jobs.js` (Schedule the `MarketingOSSegmentVerifier` to run periodically)
-   `tests/unit/services/marketing-os-verifier.test.js` (Unit tests for the verifier logic)
-   `docs/internal/marketing-os-data-flow.md` (Update to include verification process details)
4. Verifier/Runtime Checks:
-   Data Consistency Check: Every 15 minutes, select 100 random active user IDs. For each ID, retrieve their MarketingOS segment assignments from LifeOS's internal user profile store. Compare these assignments against a pre-configured, expected segment list (initially static, later potentially dynamic via an internal MarketingOS apiEP).
-   Error Rate Monitoring: Log any discrepancies (user X assigned segment Y, but expected Z) to the internal `monitoring.marketingos.segment_discrepancy` metric.
-   Service Health Check: Monitor the execution status and completion time of the `MarketingOSSegmentVerifier` job via `monitoring.marketingos.verifier_job_status` and `monitoring.marketingos.verifier_job_duration`.
-   Resource Impact Check: Ensure the verifier service's CPU and memory usage remains below 0.1% of the host's available resources and does not introduce measurable latency (p99 < 5ms) to core user profile read operations.
5. Stop Conditions if Runtime Truth Disagrees:
-   High Discrepancy Rate: If the `monitoring.marketingos.segment_discrepancy` metric reports a discrepancy rate exceeding 0.5% of sampled users over any 24-hour rolling window.
-   Verifier Service Failure: If the `MarketingOSSegmentVerifier` job fails to complete successfully for 3 consecutive scheduled runs.
-   Performance Degradation: If the verifier service causes any core LifeOS user profile read operations to exceed their p99 latency targets by more than 10% for a sustained period of 1 hour.
-   External Data Source Issue: If internal alerts indicate that the upstream MarketingOS data feed is confirmed to be offline, degraded, or providing malformed data, rendering verification invalid.