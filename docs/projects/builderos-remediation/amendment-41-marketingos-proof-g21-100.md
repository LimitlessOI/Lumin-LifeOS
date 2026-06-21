<!-- SYNOPSIS: Proof-Closing Blueprint Note: Amendment 41 MarketingOS - G21-100 -->

# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - G21-100

This document serves as the SSOT foundation for closing the proof gap related to MarketingOS Amendment 41, specifically focusing on the G21-100 objective. It outlines the exact missing implementation, the smallest safe build slice to address it, the files to touch, verification steps, and stop conditions.

## 1. Exact Missing Implementation or Proof Gap

Verification that MarketingOS `campaign_conversion` events for `segment_g21` are correctly ingested, processed, and reflected in the LifeOS user profile `marketing_attribution` field. The current gap is the lack of an automated, isolated mechanism to trigger and confirm this specific event flow within a controlled BuilderOS environment.

## 2. Smallest Safe Build Slice to Close It

Implement a temporary BuilderOS-only endpoint `/builder/verify/marketingos/g21-100` that:
1.  Accepts a `userId` as a parameter.
2.  Simulates a `campaign_conversion` event originating from MarketingOS for the specified `userId` within `segment_g21`.
3.  Triggers the LifeOS event ingestion and processing pipeline for this simulated event.
4.  Immediately queries the LifeOS user profile service to confirm the `marketing_attribution` field for the `userId` has been updated with the expected `campaign_conversion` data.
5.  Returns a clear success/failure status.
This endpoint and its associated logic will be removed post-proof completion.

## 3. Exact Safe-Scope Files to Touch First

*   `src/builder/routes/marketingos-proof.js`: New file to define the `/builder/verify/marketingos/g21-100` route and its handler.
*   `src/builder/services/marketingos-proof-service.js`: New file to encapsulate the logic for simulating the event and querying the user profile.
*   `src/builder/index.js`: Modify to register the new route from `marketingos-proof.js`.
*   `src/core/user/user-profile-service.js`: Review/modify (if necessary) to ensure the BuilderOS context has appropriate read access to the `marketing_attribution` field for verification purposes. No changes to core user features or customer-facing surfaces.

## 4. Verifier/Runtime Checks

*   **API Call:** `POST /builder/verify/marketingos/g21-100` with a JSON body `{ "userId": "test-user-id-g21" }`.
*   **Expected Response:** HTTP 200 OK with a JSON payload:
    ```json
    {
      "status": "success",
      "userId": "test-user-id-g21",
      "marketingAttributionUpdated": true,
      "details": {
        "campaignId": "g21-campaign-100",
        "conversionType": "proof-conversion",
        "timestamp": "ISO_DATE_STRING"
      }
    }
    ```
*   **Database Check (Optional, for deeper validation):** Directly query the `users` collection/table for `test-user-id-g21`. Confirm the `marketing_attribution` field contains an entry matching the simulated `campaign_conversion` event details.
*   **Log Check:** Monitor BuilderOS and LifeOS ingestion logs for `LifeOS_MarketingOS_Ingest` entries confirming successful event reception and processing for `test-user-id-g21`.

## 5. Stop Conditions if Runtime Truth Disagrees

*   The `POST /builder/verify/marketingos/g21-100` API call returns a non-200 HTTP status code.