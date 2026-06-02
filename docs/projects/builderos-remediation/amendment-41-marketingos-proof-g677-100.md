Amendment 41 MarketingOS SSOT Proof Blueprint Note (G677-100)
Signal requiring follow-through: This document — SSOT foundation.
This blueprint note addresses the proof-closing for Amendment 41, specifically verifying MarketingOS as the Single Source of Truth (SSOT) for `Campaign` metadata.
---

1.  **Exact missing implementation or proof gap:**
    The current gap is the lack of an automated, scheduled verification process that systematically compares `Campaign` metadata attributes (e.g., `campaignId`, `name`, `status`, `startDate`, `endDate`, `budget`) as stored in MarketingOS against their representations in downstream systems (e.g., LifeOS internal caches, TSOS data stores). This gap prevents continuous, auditable proof that MarketingOS is the definitive SSOT for these attributes, allowing for potential data drift or unapproved modifications outside the MarketingOS-governed flow.

2.  **Smallest safe build slice to close it:**
    Implement a read-only BuilderOS verification script (`verifyMarketingOSCampaignSSOT.js`) that fetches a sample set of `Campaign` metadata from MarketingOS via its API and then queries corresponding `Campaign` data from a designated LifeOS internal data store (e.g., a read-replica of the `campaigns` table or a specific cache service). The script will perform a direct attribute-by-attribute comparison for a predefined subset of critical `Campaign` fields. This slice is safe as it involves no writes or modifications to any system.

3.  **Exact safe-scope files to touch first:**
    *   `builderos/verification/scripts/verifyMarketingOSCampaignSSOT.js` (new file)
    *   `builderos/verification/config/marketingOSCampaignSSOT.json` (new file, for campaign IDs to verify and attribute mapping)
    *   `builderos/jobs/dailySSOTVerification.js` (extend existing job or create new, to schedule `verifyMarketingOSCampaignSSOT.js`)

4.  **Verifier/runtime checks:**
    *   **Data Consistency Check:** For each verified `Campaign` ID, assert that `MarketingOS.campaign.attribute === LifeOS.campaign.attribute` for all specified attributes (`name`, `status`, `startDate`, `endDate`, `budget`).
    *   **Source Timestamp Check:** If available, assert that `MarketingOS.campaign.lastModifiedAt >= LifeOS.campaign.lastModifiedAt` for the corresponding `Campaign` record, indicating MarketingOS as the primary source of updates.
    *   **Existence Check:** Assert that all `Campaign` IDs present in the MarketingOS sample set are also present in the LifeOS data store.
    *   **API/DB Connectivity:** Verify successful connection to both MarketingOS API and LifeOS internal data store.

5.  **Stop conditions if runtime truth disagrees:**
    *   **Attribute Mismatch:** If any `MarketingOS.campaign.attribute !== LifeOS.campaign.attribute` for a verified field.
    *   **Timestamp Anomaly:** If `LifeOS.campaign.lastModifiedAt > MarketingOS.campaign.lastModifiedAt` for a verified `Campaign`, suggesting a non-MarketingOS origin for a more recent update.
    *   **Missing Campaign:** If a `Campaign` ID present in MarketingOS is not found in LifeOS.
    *   **Connectivity Failure:** Inability to connect to either MarketingOS API or LifeOS internal data store, preventing verification.
    *   **Threshold Breach:** If the number of discrepancies exceeds a predefined tolerance (e.g., 0 for critical fields, or 1% for less critical fields).