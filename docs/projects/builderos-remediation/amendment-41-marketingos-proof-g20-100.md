# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - G20-100 Proof

This document serves as a proof-closing blueprint note for the G20-100 proof point, as defined by `AMENDMENT_41_MARKETINGOS.md`, which is the Single Source of Truth (SSOT) foundation for this amendment.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a verifiable mechanism within MarketingOS to expose the aggregated and validated performance metrics specifically for G20-100 campaigns, as required for external reporting and compliance. This includes ensuring data lineage and accuracy from ingestion to exposure.

## 2. Smallest Safe Build Slice to Close It

Implement a new, read-only API endpoint within MarketingOS that queries and presents the G20-100 campaign performance data. This slice focuses solely on data exposure, assuming underlying data ingestion and processing for G20-100 campaigns are already in place or are part of a preceding build slice. The endpoint should aggregate data based on the criteria outlined in `AMENDMENT_41_MARKETINGOS.md`.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/src/api/routes/g20-100-proof.routes.js`: Define the new API route.
*   `services/marketingos/src/api/controllers/g20-100-proof.controller.js`: Implement the controller logic to fetch and format G20-100 data.
*   `services/marketingos/src/data/services/g20-100-proof.service.js`: Implement the service layer logic to interact with the data store for G20-100 metrics.
*   `services/marketingos/src/data/repositories/g20-100-campaign.repository.js`: Extend or create methods to retrieve G20-100 specific campaign data.
*   `services/marketingos/src/schemas/g20-100-proof.schema.js`: Define the data schema for the G20-100 proof output.
*   `services/marketingos/src/tests/api/g20-100-proof.test.js`: Add unit and integration tests for the new endpoint and data retrieval.

## 4. Verifier/Runtime Checks

1.  **API Endpoint Accessibility:** A `GET` request to `/marketingos/v1/proof/g20-100` returns a `200 OK` status.
2.  **Data Structure Validation:** The response body conforms to the `g20-100-proof.schema.js` and contains expected fields (e.g., `campaignId`, `impressions`, `clicks`, `conversions`, `spend`, `reportingPeriod`).
3.  **Data Accuracy:** For a known G20-100 campaign ID, the metrics returned by the API match the corresponding metrics in the source marketing platform's reporting interface (e.g., Google Ads, Facebook Ads) within a defined tolerance (e.g., +/- 0.5%).
4.  **Data Freshness:** The `reportingPeriod` or `lastUpdated` timestamp in the API response reflects data processed within the last 24 hours.
5.  **Error Handling:** Requests with invalid parameters or for non-existent G20-100 campaign IDs return appropriate 4xx error codes (e.g., `400 Bad Request`, `404 Not Found`).

## 5. Stop Conditions if Runtime Truth Disagrees

*   If the `/marketingos/v1/proof/g20-100` endpoint consistently returns 5xx errors, indicating a systemic failure.
*   If the data accuracy check (point 3 above) shows a deviation greater than 0.5% for more than 3 consecutive test runs or for critical metrics.
*   If the API response schema significantly deviates from `g20-100-proof.schema.js`, indicating a fundamental mismatch in data contract.
*   If the data freshness check fails, indicating stale data is being served.