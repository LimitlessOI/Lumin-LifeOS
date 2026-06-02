# Amendment 41 MarketingOS Proof: G150-100 - SSOT Foundation Verification

This document outlines the blueprint for proving the Single Source of Truth (SSOT) foundation for MarketingOS as defined by Amendment 41. The focus is on establishing a verifiable mechanism to confirm data consistency with the designated SSOT.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the absence of an automated, auditable mechanism to continuously verify that MarketingOS's critical marketing entity data (e.g., customer segment memberships, campaign status flags) accurately reflects the state of its designated SSOT source (e.g., `CustomerProfileService` for customer data, `CampaignManagementService` for campaign states). While integration may exist, the *proof* of ongoing consistency is lacking.

## 2. Smallest Safe Build Slice to Close It

Implement a lightweight, scheduled `MarketingDataConsistencyVerifier` service. This service will perform periodic, sampled comparisons between MarketingOS's internal data store and the external SSOT source for a predefined set of critical entities. It will log any detected discrepancies without attempting remediation, focusing solely on proof and reporting.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketing-data-verifier.js`: New module containing the `MarketingDataConsistencyVerifier` class and its core logic.
*   `config/scheduler.js`: Update to register a new cron job that invokes the `MarketingDataConsistencyVerifier` at a defined interval (e.g., daily).
*   `tests/unit/services/marketing-data-verifier.test.js`: New unit tests for the verifier service, mocking external SSOT interactions.
*   `utils/ssot-api-client.js`: (If not existing) A minimal client to interact with the SSOT source's API for data retrieval. If existing, ensure it supports the necessary queries.

## 4. Verifier/Runtime Checks

*   **Scheduled Job Execution:** Verify that the `MarketingDataConsistencyVerifier` job executes successfully at its scheduled interval, as evidenced by scheduler logs.
*   **Discrepancy Reporting:** Monitor logs for output from `MarketingDataConsistencyVerifier`. Successful proof means logs consistently report "0 discrepancies found" for the sampled data.
*   **Sampled Data Match:** Manually query a small, known set of test entities directly from MarketingOS's internal data store and the SSOT source. Confirm that their critical attributes match exactly.
*   **Error Handling:** Introduce a temporary, controlled discrepancy in a test environment and verify that the verifier correctly identifies and reports it.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Persistent Discrepancies:** If the `MarketingDataConsistencyVerifier` consistently reports discrepancies for sampled data over multiple runs, indicating a systemic data synchronization issue.
*   **Job Failure:** If the scheduled `MarketingDataConsistencyVerifier` job fails to execute or completes with errors, preventing the proof mechanism from running.
*   **Manual Verification Failure:** If manual spot checks reveal inconsistencies that the automated verifier *should* have caught but did not, indicating a flaw in the verifier's logic or scope.
*   **Performance Impact:** If the verifier's execution significantly impacts the performance of MarketingOS or the SSOT source, requiring re-evaluation of its sampling strategy or schedule.