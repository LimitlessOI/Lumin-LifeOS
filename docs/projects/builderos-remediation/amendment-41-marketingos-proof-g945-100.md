AMENDMENT_41_MARKETINGOS Proof-Closing Blueprint Note: g945-100 MarketingOS Opt-In Synchronization Verification
This document serves as the SSOT foundation for closing proof gap g945-100, focusing on the verification of `marketingOptIn` status synchronization from LifeOS to MarketingOS.

1.  **Exact Missing Implementation or Proof Gap:**
    The exact gap is the absence of an automated, auditable, and continuously running verification process that programmatically confirms the `marketingOptIn` status for users is consistently synchronized between LifeOS and MarketingOS. This includes both initial synchronization events and ongoing updates. The current state lacks a definitive, programmatic "proof" of this cross-system consistency, leading to potential data drift and compliance risks.

2.  **Smallest Safe Build Slice to Close It:**
    Implement a new BuilderOS internal service, `MarketingOptInSyncVerifierService`, designed to periodically query a statistically significant sample of user `marketingOptIn` statuses from both LifeOS (via its internal data access layer or API) and MarketingOS (via its dedicated internal API). This service will perform a direct comparison of the statuses for each sampled user and log any detected discrepancies. This build slice is strictly read-only, operates within BuilderOS's isolated execution environment, and does not modify any user data or interact with customer-facing surfaces.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `services/builderos/MarketingOptInSyncVerifierService.js`: New ESM module containing the core verification logic, including data retrieval from LifeOS and MarketingOS, comparison, and discrepancy logging.
    *   `config/builderos/verifierJobs.js`: Update this existing BuilderOS configuration file to add a new scheduled job entry that triggers `MarketingOptInSyncVerifierService` at a defined interval (e.g., daily or hourly).
    *   `utils/builderos/marketingosInternalApi.js`: (If not already present) A new or existing utility module providing standardized, read-only access methods for querying MarketingOS internal APIs.
    *   `utils/builderos/lifeosInternalData.js`: (If not already present) A new or existing utility module providing standardized, read-only access methods for querying LifeOS internal user data related to `marketingOptIn`.

4.  **Verifier/Runtime Checks:**
    *   **Service Execution Success:** Monitor BuilderOS logs to confirm `MarketingOptInSyncVerifierService` completes its scheduled runs without unhandled exceptions or critical errors.
    *   **Consistency Report Output:** Verify that each successful service run generates a structured report (e.g., JSON log entry, internal metric push) detailing: total users sampled, count of consistent statuses, count of inconsistent statuses, and the calculated discrepancy rate.
    *   **Threshold Adherence:** Implement an automated check (e.g., Prometheus alert rule, internal dashboard monitor) to ensure the reported discrepancy rate remains below a predefined acceptable threshold (e.g., <0.05% of sampled users).
    *   **Alerting Mechanism:** Confirm that critical alerts are triggered and routed to the appropriate BuilderOS operations team if the discrepancy rate exceeds the threshold or if the `MarketingOptInSyncVerifierService` fails to complete its execution for a specified number of consecutive attempts.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   **Persistent High Discrepancy Rate:** If the reported discrepancy rate consistently exceeds the defined threshold for three or more consecutive verification runs, indicating a systemic synchronization issue.
    *   **Repeated Service Failures:** If `MarketingOptInSyncVerifierService` repeatedly fails to execute or complete its verification process due to internal errors, external API issues, or resource constraints.
    *   **Critical Alert Escalation:** If any critical alerts related to `marketingOptIn` synchronization consistency are triggered and remain unresolved for a defined period.
    *   **Manual Audit Inconsistency:** If a manual, independent spot check of a sample of users reveals significant `marketingOptIn` status discrepancies that the automated verifier failed to detect, report, or accurately quantify.