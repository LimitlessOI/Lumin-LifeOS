<!-- SYNOPSIS: Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - SSOT Foundation (g32-100) -->

# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - SSOT Foundation (g32-100)

This note outlines the necessary steps to close the proof gap `g32-100`, ensuring that the `MarketingCampaign` data model defined in `AMENDMENT_41_MARKETINGOS.md` is enforced as the Single Source of Truth (SSOT) within the MarketingOS platform.

## 1. Exact Missing Implementation or Proof Gap

The current system lacks runtime validation to ensure that `MarketingCampaign` objects, upon creation or update, strictly adhere to the canonical data model and required fields specified in `AMENDMENT_41_MARKETINGOS.md`. Specifically, there is no programmatic enforcement of the SSOT definition for campaign metadata, leading to potential data inconsistencies.

## 2. Smallest Safe Build Slice to Close It

Implement a schema validation middleware or service function for the `MarketingCampaign` API endpoints (e.g., `POST /campaigns`, `PUT /campaigns/:id`) that uses a JSON schema derived from `AMENDMENT_41_MARKETINGOS.md` to validate incoming request bodies. This slice focuses solely on input validation at the API boundary.

## 3. Exact Safe-Scope Files to Touch First

*   `src/api/marketing/campaigns/campaigns.routes.js`: To integrate the validation middleware.
*   `src/api/marketing/campaigns/campaigns.validation.js`: New file to define the validation schema and middleware function.
*   `src/schemas/marketing/campaigns/campaign-ssot.schema.json`: New file to house the canonical JSON schema for `MarketingCampaign` derived from `AMENDMENT_41_MARKETINGOS.md`.

## 4. Verifier/Runtime Checks

1.  **Positive Test Case**: Successfully create a new `MarketingCampaign` via `POST /campaigns` with a request body that fully conforms to the `campaign-ssot.schema.json`. Verify the campaign is created and stored correctly.
2.  **Negative Test Case (Missing Required Field)**