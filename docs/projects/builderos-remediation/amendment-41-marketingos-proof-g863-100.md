<!-- SYNOPSIS: Amendment 41: MarketingOS Proof - G863-100 (SSOT Foundation) -->

# Amendment 41: MarketingOS Proof - G863-100 (SSOT Foundation)

This document serves as a proof-closing blueprint note for Amendment 41, focusing on establishing and verifying the Single Source of Truth (SSOT) foundation within MarketingOS.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the lack of an automated, continuous verification mechanism to confirm that the designated MarketingOS SSOT (as defined in `AMENDMENT_41_MARKETINGOS.md`) is consistently providing accurate and up-to-date data to its primary downstream consumers. Specifically, a proof is needed that critical marketing campaign metadata and audience segmentation data, once committed to the SSOT, propagates correctly and without corruption to the `CampaignExecutionService` and `AnalyticsReportingEngine`.

## 2. Smallest Safe Build Slice to Close It

Implement a lightweight, read-only `MarketingOS-SSOT-Verifier` service. This service will periodically query a defined subset of critical data from the MarketingOS SSOT and its primary consumers (`CampaignExecutionService` and `AnalyticsReportingEngine`), then compare the datasets for consistency and integrity. This slice focuses solely on data verification, not modification or new feature exposure.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos-ssot-verifier/index.js`: Main entry point for the verifier service.
*   `services/marketingos-ssot-verifier/config.js`: Configuration for data endpoints, comparison thresholds, and verification schedules.
*   `services/marketingos-ssot-verifier/package.json`: Defines dependencies and a `start` script for the verifier.
*   `scripts/run-marketingos-ssot-verifier.sh`: A simple shell script to invoke the verifier service for CI/CD integration.

## 4. Verifier/Runtime Checks

The `MarketingOS-SSOT-Verifier` will perform the following checks:

*   **Data Consistency Check:**
    *   Query a predefined set of `Campaign` and `AudienceSegment` records from the MarketingOS SSOT.
    *   Query the corresponding records from `CampaignExecutionService` (e.g., via its internal API for campaign state) and `AnalyticsReportingEngine` (e.g., via its data warehouse interface for aggregated segment data).
    *   Compare key fields (e.g., `campaignId`, `status`, `targetAudienceId`, `segmentSize`, `lastModifiedAt`) for exact matches.
*   **Data Integrity Check:**
    *   Verify data types and schema adherence for critical fields across all sources.
    *   Check for null or unexpected values in mandatory fields.
*   **Latency Check:**
    *   Record `lastModifiedAt` timestamps from the SSOT and compare with the `ingestedAt` or `updatedAt` timestamps in consumer systems.
    *   Ensure propagation delay is within acceptable limits (e.g., < 5 minutes for critical updates).
*   **Error Reporting:**
    *   Log any discrepancies, schema mismatches, or latency violations to a designated internal monitoring system (e.g., Prometheus/Grafana, internal logging service).

## 5. Stop Conditions if Runtime Truth Disagrees

The C2 build pass should halt and flag for immediate human review under the following conditions:

*   **Critical Data Mismatch:** If more than 0.1% of sampled critical fields (e.g., `campaignId`, `status`, `targetAudienceId`) show discrepancies between the SSOT and *any* primary consumer system over a 24-hour period.
*   **Schema Violation:** If the verifier detects a schema mismatch for critical data fields in a consumer system that deviates from the SSOT's defined schema.
*   **Excessive Latency:** If the average data propagation latency for critical updates consistently exceeds 10 minutes over a 6-hour window.
*   **Verifier Service Failure:** If the `MarketingOS-SSOT-Verifier` service itself fails to execute, connect to data sources, or complete its verification cycle for more than 3 consecutive runs.
*   **Data Loss Indication:** If the verifier identifies records present in the SSOT but entirely missing from a primary consumer system, indicating potential data loss.