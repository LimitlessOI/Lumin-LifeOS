<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G1073 100. -->

Amendment 41 MarketingOS Proof - G1073-100: SSOT Foundation Verification
This document outlines the blueprint for proving Amendment 41's assertion that MarketingOS is the Single Source of Truth (SSOT) for customer marketing preferences.

1.  **Exact Missing Implementation or Proof Gap**
    The core gap is the lack of an automated, auditable verification mechanism within BuilderOS to confirm MarketingOS's data consistency and authority as the SSOT for customer marketing preferences across all integrated downstream systems. Specifically, there is no routine process to compare MarketingOS preference data against other potential sources (e.g., legacy CRM, direct user settings in LifeOS) and flag discrepancies.

2.  **Smallest Safe Build Slice to Close It**
    Implement a new BuilderOS verification job (`marketingOsSsotVerifier`) that periodically queries MarketingOS for a sample of customer marketing preferences and cross-references these with corresponding data points in a designated downstream system (e.g., `customer-profile-service`'s preference store). The job will report discrepancies without attempting to reconcile them, focusing solely on proof of SSOT adherence. This slice will not modify any LifeOS user features or TSOS customer-facing surfaces.

3.  **Exact Safe-Scope Files to Touch First**
    *   `builderos/jobs/marketingOsSsotVerifier.js` (new file for verification logic)
    *   `builderos/config/jobs.json` (add configuration for the new job)
    *   `builderos/schemas/marketingOsSsotVerifierConfig.json` (new schema for job configuration)
    *   `builderos/services/marketingOsApiClient.js` (if not existing, client for MarketingOS API)
    *   `builderos/services/customerProfileApiClient.js` (if not existing, client for customer profile service API)

4.  **Verifier/Runtime Checks**
    *   **Manual Trigger:** Execute `builderos-cli job run marketingOsSsotVerifier --sampleSize=100 --reportOnly`
    *   **Automated Schedule:** Verify `builderos/config/jobs.json` includes `marketingOsSsotVerifier` with a daily schedule.
    *   **Log Output:** Check BuilderOS job logs for `marketingOsSsotVerifier` for `SSOT_DISCREPANCY` events. Expected output: `0 SSOT_DISCREPANCY events detected.`
    *   **Metrics:** Monitor `builderos.job.marketingOsSsotVerifier.discrepancies.count` metric. Expected value: `0`.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `marketingOsSsotVerifier` job fails to run or complete successfully.
    *   If `marketingOsSsotVerifier` job reports any `SSOT_DISCREPANCY` events.
    *   If the `builderos.job.marketingOsSsotVerifier.discrepancies.count` metric is greater than `0`.
    *   If the job cannot connect to MarketingOS or the designated downstream system, indicating a foundational integration issue.