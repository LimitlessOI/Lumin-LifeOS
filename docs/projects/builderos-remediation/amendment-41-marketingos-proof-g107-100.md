### Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - G107-100

This document serves as the SSOT foundation for closing the proof gap related to `AMENDMENT_41_MARKETINGOS`.

#### 1. Exact Missing Implementation or Proof Gap

The specific gap is the lack of a verifiable, automated assertion that `MarketingOS` campaign performance data, specifically `campaign_conversion_rate` for a given `campaignId`, is accurately ingested, stored, and retrievable from the LifeOS internal data store, maintaining its status as the Single Source of Truth (SSOT). The current state lacks a dedicated, isolated check to confirm data fidelity post-ingestion against the original MarketingOS source.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves creating a read-only verification script or a dedicated internal test endpoint that queries the LifeOS internal API for a specific `campaignId`'s `campaign_conversion_rate` and compares it against a known, pre-verified value directly from MarketingOS. This slice does not modify any existing production code or user-facing features.

#### 3. Exact Safe-Scope Files to Touch First

*   `scripts/proofs/marketingos/g107-100-verify-campaign-conversion-rate.js` (New file)
*   `package.json` (Add a new script entry for running the proof, e.g., `"proof:g107-100": "node scripts/proofs/marketingos/g107-100-verify-campaign-conversion-rate.js"`)

#### 4. Verifier/Runtime Checks

The `g107-100-verify-campaign-conversion-rate.js` script will perform the following:
1.  **Configuration:** Load `MARKETINGOS_API_KEY` and `LIFEOS_INTERNAL_API_URL` from environment variables. Define a test `campaignId` (e.g., `CAMPAIGN_ID_G107_TEST`) and its expected `campaign_conversion_rate` directly from MarketingOS (e.g., `EXPECTED_CONVERSION_RATE_G107_TEST`).
2.  **MarketingOS Query (Simulated/Pre-verified):** For this proof, the expected value is hardcoded or retrieved from a trusted, external source *before* the proof run. In a full integration, this would involve a direct MarketingOS API call. For the smallest safe slice, we use a pre-verified expected value.
3.  **LifeOS Internal API Query:** Make an authenticated GET request to `LIFEOS_INTERNAL_API_URL/campaigns/${CAMPAIGN_ID_G107_TEST}/metrics` to retrieve the `campaign_conversion_rate`.
4.  **Comparison:** Compare the retrieved `campaign_conversion_rate` from LifeOS with `EXPECTED_CONVERSION_RATE_G107_TEST`.
5.  **Assertion:** Assert that the values match within a defined tolerance (e.g., `0.0001` for floating-point numbers).
6.  **Output:** Log success or failure with detailed comparison results.

#### 5. Stop Conditions if Runtime Truth Disagrees

The proof run must stop and signal failure if any of the following conditions are met:
*   The `campaign_conversion_rate` retrieved from LifeOS for `CAMPAIGN_ID_G107_TEST` does not match `EXPECTED_CONVERSION_RATE_G107_TEST` within the specified tolerance.
*   The LifeOS internal API returns an error status (e.g., 4xx, 5xx) or times out.
*   The data for `CAMPAIGN_ID_G107_TEST` is missing or malformed in the LifeOS response.
*   Required environment variables (`MARKETINGOS_API_KEY`, `LIFEOS_INTERNAL_API_URL`) are not set.