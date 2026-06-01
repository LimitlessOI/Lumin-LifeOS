# AMENDMENT_41_MARKETINGOS - Proof G57-100: SSOT Foundation for Customer Segments

This document outlines the proof-closing blueprint note for establishing the Single Source of Truth (SSOT) foundation for `CustomerSegment` data within MarketingOS, as per the signal from `AMENDMENT_41_MARKETINGOS.md`.

## 1. Exact Missing Implementation or Proof Gap

MarketingOS currently lacks a verified, direct, and real-time integration path to consume and display `CustomerSegment` data from the LifeOS `CustomerDataStore`, which is designated as the SSOT. The proof gap is the absence of a production-ready, validated mechanism ensuring MarketingOS consistently reflects the authoritative `CustomerSegment` definitions and memberships from the `CustomerDataStore`.

## 2. Smallest Safe Build Slice to Close It

Implement a read-only internal API endpoint within MarketingOS that directly queries the LifeOS `CustomerDataStore` (via its established client interface) to retrieve `CustomerSegment` definitions and their associated metadata. This slice focuses solely on data retrieval and exposure for internal MarketingOS consumption, without introducing any data modification capabilities or complex business logic.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/src/api/customerSegments/getSegments.js` (New file: Implements the API handler for fetching segments.)
*   `services/marketingos/src/routes/customerSegments.js` (Update: Registers the new `GET /api/v1/customer-segments` route.)
*   `services/marketingos/src/data/customerDataStoreClient.js` (New/Update: Ensures a robust client for `CustomerDataStore` interactions, if not already present and fully functional.)
*   `services/marketingos/tests/api/customerSegments/getSegments.test.js` (New file: Unit and integration tests for the new endpoint.)

## 4. Verifier/Runtime Checks

1.  **Deployment Verification:** Confirm successful deployment of the updated MarketingOS service without errors.
2.  **API Endpoint Accessibility:** Execute a `GET` request to `/api/v1/customer-segments` from an authorized internal client.
3.  **Data Presence and Format:** Verify the API response is a JSON array of `CustomerSegment` objects, each containing expected fields (e.g., `id`, `name`, `description`, `criteria`).
4.  **Data Consistency:** Select a sample of 5-10 returned `CustomerSegment` IDs and cross-reference their details (name, description) directly against the `CustomerDataStore` via its native query interface. Confirm exact matches.
5.  **Data Freshness:** Introduce a new `CustomerSegment` into the `CustomerDataStore`. Within 60 seconds, re-query the MarketingOS API and verify the new segment appears in the response.
6.  **Error Handling:** Simulate a `CustomerDataStore` unavailability (e.g., by temporarily blocking network access from MarketingOS to `CustomerDataStore`) and verify the MarketingOS API returns an appropriate 5xx error with informative logging.

## 5. Stop Conditions if Runtime Truth Disagrees

1.  **API Unreachable/Error:** If the `/api/v1/customer-segments` endpoint returns any 4xx or 5xx status code other than expected during error simulation.
2.  **Empty/Malformed Response:** If the API returns an empty array when `CustomerDataStore` is known to contain segments, or if the response schema deviates from the expected `CustomerSegment` structure.
3.  **Data Inconsistency:** If more than 10% of sampled `CustomerSegment` data points (name, description) from the API do not precisely match the `CustomerDataStore` within a 5-minute window.
4.  **Stale Data:** If a newly created `CustomerSegment` in `CustomerDataStore` does not appear in the MarketingOS API response within 5 minutes.
5.  **Performance Degradation:** If the API response time for `/api/v1/customer-segments` consistently exceeds 500ms under typical load.