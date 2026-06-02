# AMENDMENT_41_MARKETINGOS: Proof-Closing Blueprint Note (G729-100)

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal Requiring Follow-Through:** This document — SSOT foundation.

---

This blueprint note addresses the proof-closing for the SSOT foundation established by AMENDMENT_41_MARKETINGOS, specifically focusing on the `campaign_id` attribute synchronization.

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a verifiable, automated proof that the `campaign_id` attribute, as consumed by MarketingOS from LifeOS's `CampaignService`, consistently adheres to LifeOS as the Single Source of Truth (SSOT). While the integration logic may exist, the explicit runtime verification mechanism to *prove* this SSOT adherence is missing.

### 2. Smallest Safe Build Slice to Close It

Implement a lightweight, ephemeral `CampaignIDSSOTVerifier` module within MarketingOS. This module will perform a targeted, read-only comparison of `campaign_id` values for a defined subset of entities, cross-referencing MarketingOS's stored values against the canonical values exposed by LifeOS's `CampaignService`. This slice focuses purely on verification, not data modification.

### 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/src/data/verification/CampaignIDSSOTVerifier.js` (New module for verification logic)
*   `services/marketingos/src/data/verification/index.js` (To export the new verifier)
*   `services/marketingos/test/data/verification/CampaignIDSSOTVerifier.test.js` (New unit tests for the verifier)
*   `services/marketingos/src/jobs/BuilderOSVerificationJob.js` (Extend an existing or create a new BuilderOS-triggered job to invoke `CampaignIDSSOTVerifier.run()`)

### 4. Verifier/Runtime Checks

*   **Execution Trigger:** BuilderOS initiates `BuilderOSVerificationJob` which calls `CampaignIDSSOTVerifier.run()`.
*   **Success Condition:** The `CampaignIDSSOTVerifier` completes its comparison for a statistically significant sample (e.g., 1000 randomly selected active campaigns) and reports 100% match rate between MarketingOS and LifeOS `campaign_id` values.
*   **Logging:** The verifier logs `SSOT_PROOF_SUCCESS: CampaignIDSSOTVerifier` along with the count of verified records and the match percentage.
*   **Telemetry:** Emit a `builderos.proof.campaign_id_ssot.success` metric with the match percentage.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Mismatch Detected:** If `CampaignIDSSOTVerifier` reports any discrepancy (match rate < 100%) for the sampled entities.
*   **Verification Failure:** If the verifier module encounters an unhandled error during execution (e.g., API connectivity issues, data parsing errors).
*   **Incomplete Sample:** If the number of entities successfully sampled and verified falls below the defined statistical significance threshold (e.g., fewer than 1000 records processed).
*   **Telemetry Anomaly:** If the `builderos.proof.campaign_id_ssot.success` metric indicates a consistent drop below 100% over multiple runs.

---