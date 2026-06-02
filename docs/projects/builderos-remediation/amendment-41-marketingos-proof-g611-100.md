# Proof-Closing Blueprint Note: Amendment 41 MarketingOS Proof (g611-100)

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

---

This blueprint note addresses proof gap `g611-100`, focusing on the Single Source of Truth (SSOT) foundation for MarketingOS `MarketingCampaign` entities.

### 1. Exact Missing Implementation or Proof Gap

The proof gap `g611-100` is the lack of a verified end-to-end data flow for `MarketingCampaign` entities within MarketingOS, specifically ensuring that a `MarketingCampaign` created or updated via the MarketingOS API is correctly persisted, marked as SSOT, and consistently retrievable via the designated SSOT query interface. There is currently no automated verification that the SSOT status for `MarketingCampaign` data is consistently maintained across creation and update operations.

### 2. Smallest Safe Build Slice to Close It

Implement a new integration test suite within the `MarketingOS` service. This suite will simulate the creation and update of `MarketingCampaign` entities through the existing MarketingOS API endpoints, then query the SSOT interface to assert data consistency and the correct presence of the SSOT flag. This build slice is confined to internal service verification and does not introduce new user features or modify existing customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/src/tests/integration/campaigns.ssot.test.ts` (NEW FILE)
*   `services/marketingos/src/api/campaigns/campaigns.controller.ts` (Read-only for API endpoint reference)
*   `services/marketingos/src/api/campaigns/campaigns.service.ts` (Read-only for service logic reference)
*   `services/marketingos/src/data/campaigns/campaign.model.ts` (Read-only for data model reference)

### 4. Verifier/Runtime Checks

The integration test suite (`campaigns.ssot.test.ts`) will include the following checks:

*   **Test Case 1: `MarketingCampaign` Creation and SSOT Verification**
    *   **Action:** Send a `POST` request to `/api/marketingos/campaigns` with valid `MarketingCampaign` payload.
    *   **Assertion 1:** HTTP status code is `201 Created`.
    *   **Action:** Extract the `campaignId` from the response.
    *   **Action:** Send a `GET` request to `/api/marketingos/campaigns/{campaignId}`.
    *   **Assertion 2:** HTTP status code is `200 OK`.
    *   **Assertion 3:** The retrieved `MarketingCampaign` data matches the initially created payload.
    *   **Assertion 4:** The `isSSOT` flag (or equivalent SSOT marker field) within the retrieved campaign data is `true`.

*   **Test Case 2: `MarketingCampaign` Update and SSOT Verification**
    *   **Action:** Perform `MarketingCampaign` creation as in Test Case 1 to obtain a `campaignId`.
    *   **Action:** Send a `PUT` request to `/api/marketingos/campaigns/{campaignId}` with an updated `MarketingCampaign` payload.
    *   **Assertion 1:** HTTP status code is `200 OK`.
    *   **Action:** Send a `