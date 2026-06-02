# BuilderOS Remediation: Amendment 41 MarketingOS Proof (G531-100)

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

## Proof-Closing Blueprint Note

This note outlines the necessary steps to close the proof gap for `AMENDMENT_41_MARKETINGOS.md`, specifically focusing on the Single Source of Truth (SSOT) foundation for MarketingOS data, using user `g531-100` as a specific verification target.

### 1. Exact Missing Implementation or Proof Gap

The current state lacks an automated, auditable verification mechanism to confirm that the `user.marketingConsentStatus` attribute, as established and maintained within LifeOS (the designated SSOT), is accurately and consistently reflected in MarketingOS for a specific user, `g531-100`. The proof gap is the absence of a direct, programmatic assertion of this data consistency across systems.

### 2. Smallest Safe Build Slice to Close It

Implement a lightweight, idempotent BuilderOS verification script that performs a direct comparison of `user.marketingConsentStatus` for user `g531-100` by querying both LifeOS and MarketingOS APIs. This script will execute as a scheduled or on-demand BuilderOS job.

### 3. Exact Safe-Scope Files to Touch First

*   **New File:** `builderos/verification/marketingos-ssot-g531-100.js` (Node.js ESM script)
    *   This script will contain the core logic for fetching and comparing the consent status.
*   **New File (if not existing):** `builderos/utils/lifeos-api.js`
    *   A utility module to encapsulate LifeOS API calls (e.g., `getUserMarketingConsentStatus(userId)`).
*   **New File (if not existing):** `builderos/utils/marketingos-api.js`
    *   A utility module to encapsulate MarketingOS API calls (e.g., `getUserMarketingConsentStatus(userId)`).
*   **Modify File:** `builderos/config/verification-jobs.json`
    *   Add a new entry to schedule or register the `marketingos-ssot-g531-100.js` script as a BuilderOS verification job.

### 4. Verifier/Runtime Checks

*   **Execution:** Trigger the `marketingos-ssot-g531-100.js` script via BuilderOS.
*   **Output:** The script must output a clear `PASS` or `FAIL` status to standard output, along with details of any discrepancies if `FAIL`.
*   **Assertion:**
    *   `LifeOS.getUserMarketingConsentStatus('g531-100')` MUST strictly equal `MarketingOS.getUserMarketingConsentStatus('g531-100')`.
    *   The script should handle API errors gracefully, reporting them as `FAIL` with relevant error messages.
*   **Monitoring:** BuilderOS job logs will be monitored for the `PASS`/`FAIL` status and any associated error messages.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Data Mismatch:** If the `marketingos-ssot-g531-100.js` script consistently reports `FAIL` due to a discrepancy in `user.marketingConsentStatus` between LifeOS and MarketingOS for user `g531-100` (or a representative sample), all further MarketingOS-related deployments or data synchronization processes are to be halted immediately. Investigation into the data propagation pipeline is required.
*   **API Unavailability:** If either the LifeOS or MarketingOS API is unreachable or returns unexpected errors (e.g., 5xx status codes, malformed responses) preventing the script from completing its comparison, the verification process stops, and an alert is raised for API connectivity/health investigation.
*   **Script Error:** If the `marketingos-ssot-g531-100.js` script itself encounters unhandled exceptions or logical errors, indicating a flaw in the verification logic or environment, the proof is considered inconclusive, and the script must be debugged and corrected before re-execution.