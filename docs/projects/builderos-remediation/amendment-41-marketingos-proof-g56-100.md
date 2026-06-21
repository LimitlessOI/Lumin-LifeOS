<!-- SYNOPSIS: Amendment 41: MarketingOS Proof - G56-100 Blueprint Note -->

# Amendment 41: MarketingOS Proof - G56-100 Blueprint Note

**Signal requiring follow-through: This document — SSOT foundation.**

This blueprint note addresses the immediate proof-closing requirements for Amendment 41, focusing on establishing LifeOS as the Single Source of Truth (SSOT) for MarketingOS campaign metadata. The goal is to verify the foundational data exposure mechanism.

---

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a verified, read-only API endpoint in LifeOS that exposes `MarketingCampaign` metadata, confirming LifeOS's role as the SSOT for this dataset as specified in `AMENDMENT_41_MARKETINGOS.md`. Specifically, the `GET /api/v1/marketing/campaigns/{campaignId}` endpoint is not yet implemented or verified to return the SSOT data accurately and reliably. This endpoint is crucial for downstream systems to consume the SSOT.

### 2. Smallest Safe Build Slice to Close It

Implement the `GET /api/v1/marketing/campaigns/{campaignId}` API endpoint. This endpoint will retrieve `MarketingCampaign` metadata from the LifeOS database based on the provided `campaignId`. This slice focuses solely on the *exposure* of the SSOT data, assuming the `MarketingCampaign` data model and initial data population (e.g., via seeding or a placeholder ingestion mechanism) are in place or can be mocked for proof. This proves the capability to serve the SSOT.

### 3. Exact Safe-Scope Files to Touch First

*   `src/api/routes/marketing.routes.js`: Add the new GET route definition for `/campaigns/:campaignId`.
*   `src/services/marketingCampaign.service.js`: Implement the `getCampaignById(campaignId)` function to fetch campaign data from the database.
*   `src/models/MarketingCampaign.js`: (Verify existence and schema alignment with `AMENDMENT_41_MARKETINGOS.md`. If not fully defined, update/create the model to reflect the SSOT schema for `MarketingCampaign`.)
*   `src/tests/api/marketing.test.js`: Add integration tests for the new `GET /api/v1/marketing/campaigns/{campaignId