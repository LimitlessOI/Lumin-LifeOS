# Proof-Closing Blueprint Note: MarketingOS Proof Gap G1015-100

## 1. Exact missing implementation or proof gap

The `AMENDMENT_41_MARKETINGOS.md` blueprint establishes the canonical definition for `MarketingCampaignStatus` and its lifecycle states, which are foundational for downstream reporting and automation. Proof gap `g1015-100` is the absence of a dedicated, read-only API endpoint to retrieve the current `MarketingCampaignStatus` for a given `campaignId` from the MarketingOS backend. This endpoint is critical for external systems (e.g., LifeOS, BuilderOS verifiers) to programmatically verify the SSOT status of campaigns against the blueprint's specification. Without this, programmatic proof of `MarketingCampaignStatus` adherence is incomplete.

## 2. Smallest safe build slice to close it

Implement a new GET endpoint `/marketingos/campaigns/:campaignId/status` within the existing MarketingOS API surface. This endpoint will:
*   Accept a `campaignId` path parameter.
*   Query the MarketingOS internal data store (e.g., `Campaign` table) to fetch the `MarketingCampaignStatus` associated with the given `campaignId`.
*   Return the `MarketingCampaignStatus` as a JSON object, adhering to the schema defined in `AMENDMENT_41_MARKETINGOS.md`.
*   Be read-only and idempotent.
*   Utilize existing authentication and authorization middleware.

## 3. Exact safe-scope files to touch first

*   `src/api/marketingos/campaigns/status.js` (New file: Route handler for `/marketingos/campaigns/:campaignId/status`)
*   `src/api/marketingos/routes.js` (Existing file: Register the new `status` route)
*   `src/services/marketingos/campaignService.js` (Existing file: Add a new method `getCampaignStatus(campaignId)`)
*   `src/models/marketingos/Campaign.js` (Existing file: Ensure `MarketingCampaignStatus` field is correctly defined and accessible)
*   `src/tests/api/marketingos/campaigns/status.test.js` (New file: Unit and integration tests for the new endpoint)

## 4. Verifier/runtime checks

*   **API Call Success:** `GET /marketingos/campaigns/{validCampaignId}/status` returns HTTP 200 with a JSON payload matching the `MarketingCampaignStatus` schema defined in `AMENDMENT_41_MARKETINGOS.md`.
*   **Data Integrity:** The `status` field in the returned JSON accurately reflects the current, canonical `MarketingCampaignStatus` in the MarketingOS backend for the specified `campaignId`.
*   **Error Handling (Not Found):** `GET /marketingos/campaigns/{invalidCampaignId}/status` returns HTTP 404.
*   **Error Handling (Internal Server Error):** `GET /marketingos/campaigns/{campaignId}/status` returns HTTP 500 for unexpected backend errors.
*   **Authorization:** Access to this endpoint is