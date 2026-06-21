<!-- SYNOPSIS: Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - SSOT Foundation (G37-100) -->

# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - SSOT Foundation (G37-100)

This document serves as a proof-closing blueprint note for Amendment 41, specifically addressing the "SSOT foundation" signal for MarketingOS integration. The objective is to verify that the foundational data model for MarketingOS campaigns is correctly established as a Single Source of Truth within the LifeOS platform.

---

### 1. Exact Missing Implementation or Proof Gap

The core gap is the *proof* that the `MarketingCampaign` data model, as implicitly defined by `AMENDMENT_41_MARKETINGOS.md` for SSOT purposes, is correctly exposed via a designated internal API endpoint and consistently serves as the Single Source of Truth for campaign metadata within the LifeOS platform. This includes verifying the immutability of critical fields like `campaignId` and `campaignStatus` from external writes via this SSOT exposure.

### 2. Smallest Safe Build Slice to Close It

Implement the foundational `MarketingCampaign` data model definition and a read-only internal API endpoint (`/api/v1/marketing/campaigns/:campaignId`) that retrieves campaign metadata. This endpoint must source data directly from the designated MarketingOS SSOT data store (e.g., a specific database table or an internal MarketingOS microservice API). The implementation should focus solely on read operations for verification.

### 3. Exact Safe-Scope Files to Touch First

*   `src/schemas/marketingCampaignSchema.js` (Define Joi/Zod schema for `MarketingCampaign` entity)
*   `src/services/marketingCampaignService.js` (Service layer for data retrieval from SSOT)
*   `src/api/v1/marketing/campaigns/getCampaignById.js` (API route handler for `GET /api/v1/marketing/campaigns/:campaignId`)
*   `src/routes/v1/marketingRoutes.js` (Register the new `GET` route)
*   `test/integration/marketing/campaigns.test.js` (Integration tests for the new endpoint)

### 4. Verifier/Runtime Checks

*   **API Response Code:** `GET /api/v1/marketing/campaigns/{validCampaignId