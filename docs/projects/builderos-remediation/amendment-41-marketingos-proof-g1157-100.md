### AMENDMENT 41: MarketingOS SSOT Foundation Proof (G1157-100)

This blueprint note addresses the proof-closing for the Single Source of Truth (SSOT) foundation within MarketingOS, as outlined in `AMENDMENT_41_MARKETINGOS.md`. The objective is to verify that core MarketingOS entities are indeed sourced from the designated SSOT.

1.  **Exact missing implementation or proof gap:**
    The gap is the verifiable runtime proof that MarketingOS components consume `Campaign` and `CustomerSegment` entities exclusively from the established SSOT, and that the SSOT itself is operational and consistent. Specifically, proving data provenance and consistency for these critical entities.

2.  **Smallest safe build slice to close it:**
    Implement a targeted data provenance logging mechanism within MarketingOS data access layers for `Campaign` and `CustomerSegment` reads. Develop a read-only BuilderOS verification script to query the SSOT directly and cross-reference a sample of active MarketingOS entity states.

3.  **Exact safe-scope files to touch first:**
    *   `src/marketingos/data-access/campaignRepository.js` (Add SSOT source logging to `getById` and `list` methods)
    *   `src/marketingos/data-access/customerSegmentRepository.js` (Add SSOT source logging to `getById` and `list` methods)
    *   `src/builderos/verification/marketingOsSsotProof.js` (New file: Verification script for SSOT consistency)
    *   `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g1157-100.md` (This document)

4.  **Verifier/runtime checks:**
    *   **Provenance Log Check:** Analyze logs from `campaignRepository.js` and `customerSegmentRepository.js` to confirm all `getById` and `list` operations explicitly log retrieval from the configured SSOT service endpoint.
    *   **Consistency Script Execution:** Run `src/builderos/verification/marketingOsSsotProof.js`. This script will:
        *   Fetch a random sample of 100 `Campaign` and 100 `CustomerSegment` IDs currently active in MarketingOS.
        *   Query the SSOT directly for these IDs.
        *   Query a representative MarketingOS component (e.g., `CampaignSchedulerService` or `SegmentTargetingService`) for its current view of these entities.
        *   Compare key attributes (e.g., `status`, `name`, `targetAudienceId` for Campaign; `criteria`, `memberCount` for CustomerSegment) for consistency.
    *   **SSOT Availability Check:** The verification script must successfully connect to and query the SSOT.

5.  **Stop conditions if runtime truth disagrees:**
    *   If provenance logs show any `Campaign` or `CustomerSegment` data being sourced from non-SSOT systems.
    *   If the consistency script reports more than 0.5% data discrepancies (mismatched key attributes) between the SSOT and the MarketingOS component's view for the sampled entities.
    *   If the SSOT is unreachable or returns errors during the verification script execution.
    *   If the verification script fails to retrieve a sufficient sample of active MarketingOS entities.