# Amendment 41: MarketingOS Proof - G121-100

## Proof-Closing Blueprint Note

This document serves as a blueprint note to close the proof gap for Amendment 41, specifically focusing on the G121-100 campaign's consumption of SSOT-defined data by MarketingOS.

### 1. Exact Missing Implementation or Proof Gap

The core SSOT foundation for user segmentation data is established within LifeOS. However, the *proof* that MarketingOS is successfully and accurately consuming the SSOT-defined G121-100 user segment data, and that this data remains consistent and up-to-date, is currently missing. This gap prevents full confidence in MarketingOS's operational alignment with the SSOT.

### 2. Smallest Safe Build Slice to Close It

Implement a dedicated, read-only verification service within LifeOS that can:
a. Query the canonical SSOT for the G121-100 user segment.
b. Query the MarketingOS integration layer (or a designated MarketingOS API endpoint) to retrieve its current understanding of the G121-100 segment.
c. Compare the two datasets for consistency, completeness, and recency.
d. Expose the verification results via a secure, internal API endpoint.

This slice specifically avoids modifying MarketingOS itself or LifeOS's core SSOT data structures. It focuses solely on the *observability and verification* of the data flow.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketingosProofService.js`: New module containing the logic for querying SSOT, querying MarketingOS (via an assumed internal API or mock), and performing data comparison.
*   `src/routes/internal/marketingosProofRoutes.js`: New module defining an internal API endpoint (e.g., `/internal/marketingos/proof/g121-100`) that triggers the `marketingosProofService` and returns its results.
*   `src/app.js` (or equivalent main entry point): Add a new route group for `/internal/marketingos` to include `marketingosProofRoutes.js`.
*   `src/config/marketingos.js` (or similar): Add configuration for MarketingOS internal API endpoint URL and authentication details (if required for verification queries).

### 4. Verifier/Runtime Checks

*   **API Endpoint Check:** A `GET` request to `/internal/marketingos/proof/g121-100` must return a `200 OK` status code.
*   **Data Consistency Check:** The response payload from the proof endpoint must include:
    *   `ssot_segment_count`: Number of users in G121-100 from LifeOS SSOT.
    *   `marketingos_segment_count`: Number of users in G121-100 reported by MarketingOS.
    *   `discrepancy_count`: Number of users present in one but not the other.
    *   `last_sync_timestamp`: Timestamp of the last successful data sync observed by MarketingOS for this segment.
    *   `status`: `PASS` if `discrepancy_count` is zero and `last_sync_timestamp` is within an acceptable freshness window (e.g., last 24 hours), otherwise `FAIL`.
*   **Sample Data Integrity:** For a small, randomly selected subset of users, verify that key attributes (e.g., `user_id`, `email_hash`, `segment_membership_status`) match between SSOT and MarketingOS's reported data.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If the `/internal/marketingos/proof/g121-100` endpoint returns any status other than `200 OK`.
*   If the `status` field in the proof endpoint's response is `FAIL`.
*   If `discrepancy_count` is greater than 0.
*   If `last_sync_timestamp` indicates data older than 24 hours.
*   If manual inspection of sample data reveals critical attribute mismatches not caught by automated counts.