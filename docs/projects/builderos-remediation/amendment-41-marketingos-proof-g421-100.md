# Proof-Closing Blueprint Note: Amendment 41 MarketingOS SSOT Foundation (G421-100)

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal Requiring Follow-Through:** This document — SSOT foundation.

---

### 1. Exact Missing Implementation or Proof Gap

The core proof gap is the absence of a verifiable, automated mechanism to assert that the data ingested into MarketingOS via Amendment 41 truly functions as the Single Source of Truth (SSOT) for its designated domain. Specifically, the current state lacks:
*   **Data Completeness Verification:** Automated checks to confirm all expected records and fields from the source are present in MarketingOS.
*   **Data Consistency Verification:** Automated reconciliation to ensure critical data points in MarketingOS precisely match their source counterparts post-ingestion.
*   **Data Timeliness Verification:** Automated monitoring of data freshness, ensuring updates from the source are reflected in MarketingOS within defined Service Level Objectives (SLOs).
*   **SSOT Authority Assertion:** A runtime check that confirms MarketingOS is the authoritative source for this data, preventing silent divergence or conflicting data from other systems.

### 2. Smallest Safe Build Slice to Close It

Implement a lightweight, read-only, scheduled data reconciliation and validation service. This service will:
1.  Periodically sample a statistically significant subset of data from the external source system (as defined by Amendment 41).
2.  Concurrently sample the corresponding data from MarketingOS.
3.  Perform a field-by-field comparison of critical attributes for the sampled records.
4.  Report discrepancies, completeness gaps, and timeliness violations.
5.  Integrate with existing alerting infrastructure.

This slice is read-only and operates out-of-band, ensuring no modification to LifeOS user features or TSOS customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

*   `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g421-100.md` (This document)
*   `src/services/marketingos-ssot-verifier/index.js`: Main entry point for the SSOT verifier service.
*   `src/services/marketingos-ssot-verifier/config.js`: Configuration for source/target endpoints, comparison fields, sampling rates, and schedule.
*   `src/services/marketingos-ssot-verifier/data-access.js`: Abstraction layer for fetching data from the external source and MarketingOS APIs/DB.
*   `src/services/marketingos-ssot-verifier/comparison-logic.js`: Core logic for data comparison, discrepancy detection, and reporting.
*   `src/jobs/ssot-verification-scheduler.js`: A new scheduled job definition to trigger the verifier service periodically (e.g., hourly).
*   `src/utils/alerting.js`: Extend existing alerting utility to include SSOT verification specific alerts.

### 4. Verifier/Runtime Checks

*   **Record Count Match:** For sampled entity types, the number of records in MarketingOS must match the source within a 0.01% tolerance.
*   **Key Field Value Consistency:** For a random sample of 1000 records per entity type, critical fields (e.g., `id`, `external_ref_id`, `status`, `last_modified_at`, `primary_metric`) must match exactly between source and MarketingOS.
*   **Timeliness Delta:** `last_modified_at` timestamps in MarketingOS for recently updated records must be within 5 minutes of the source system's `last_modified_at` for 99.9% of sampled records.
*   **Discrepancy Rate Threshold:** The overall