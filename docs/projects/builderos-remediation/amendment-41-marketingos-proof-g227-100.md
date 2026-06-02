# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - G227-100 SSOT Foundation

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal Requiring Follow-Through:** This document — SSOT foundation.

---

### 1. Exact Missing Implementation or Proof Gap

The exact gap is the verified establishment of `MarketingCampaign` data, specifically for `campaign_id` `G227-100`, as the Single Source of Truth (SSOT) within the LifeOS `Campaign` domain, following its ingestion from MarketingOS as defined by Amendment 41. This involves confirming data integrity, completeness, and timely synchronization for a specific, representative campaign entity.

### 2. Smallest Safe Build Slice to Close It

Implement a dedicated, isolated verification routine within the `marketingos-sync` service. This routine will programmatically trigger a known state change for `campaign_id: G227-100` in MarketingOS, then query both MarketingOS and LifeOS to assert the synchronized state and SSOT attributes. This slice focuses purely on verification, not on modifying existing sync logic.

### 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos-sync/src/verification/campaignSyncVerifier.js` (New file: Contains the core verification logic, including API calls to both MarketingOS and LifeOS, and assertion logic.)
*   `services/marketingos-sync/src/api/marketingosClient.js` (Existing/Extend: Ensure a method exists to query MarketingOS campaign data by ID.)
*   `services/campaign-service/src/api/campaignController.js` (Existing/Extend: Ensure a read-only endpoint exists to retrieve LifeOS campaign data by ID, if not already present.)
*   `tests/integration/marketingos-sync/campaignSync.test.js` (New file: Integration test to execute `campaignSyncVerifier.js` and report results.)

### 4. Verifier/Runtime Checks

1.  **Pre-condition:** Ensure `campaign_id: G227-100` exists in MarketingOS with a known initial state (e.g., `status: 'draft'`, `budget: 500`).
2.  **Action:** Programmatically update `campaign_id: G227-100` in MarketingOS (e.g., `status: 'active'`, `budget: 1000`, `name: 'Proof Campaign G227-100'`).
3.  **Wait:** Allow for the expected synchronization interval (e.g., 30-60 seconds).
4.  **Query MarketingOS:** Retrieve the updated state of `campaign_id: G227-100` directly from the MarketingOS API.
5.  **Query LifeOS:** Retrieve the state of `campaign_id: G227-100` from the LifeOS `campaign-service` API.
6.  **Assertions:**
    *   `LifeOS.Campaign` entity for `G227-100` exists.
    *   `LifeOS.Campaign.status` matches `MarketingOS.Campaign.status` (`'active'`).
    *   `LifeOS.Campaign.budget` matches `MarketingOS.Campaign.budget` (`1000`).
    *   `LifeOS.Campaign.name` matches `MarketingOS.Campaign.name` (`'Proof Campaign G227-100'`).
    *   `LifeOS.Campaign.source_system` is `MarketingOS`.
    *   `LifeOS.Campaign.last_synced_at` is within the last 2 minutes.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `LifeOS.Campaign` entity for `G227-100` is not