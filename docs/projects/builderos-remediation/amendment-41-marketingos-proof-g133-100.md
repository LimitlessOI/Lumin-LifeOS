# Proof-Closing Blueprint Note: MarketingOS Data Sync Verification (g133-100)

This document outlines the proof-closing steps for `g133-100`, focusing on establishing LifeOS as the SSOT foundation for MarketingOS `campaign_event_log` data.

## 1. Exact Missing Implementation or Proof Gap

The exact missing implementation is the automated, programmatic verification of `campaign_event_log` data synchronization from MarketingOS into LifeOS, ensuring LifeOS maintains SSOT integrity for these records. Specifically, a mechanism to compare a representative sample of MarketingOS `campaign_event_log` entries against their corresponding records in LifeOS, identifying any discrepancies in content or presence.

## 2. Smallest Safe Build Slice to Close It

Implement a new BuilderOS internal endpoint and associated service logic to perform on-demand or scheduled verification of MarketingOS `campaign_event_log` data against LifeOS SSOT. This slice will:
*   Define a new BuilderOS API route for triggering the verification.
*   Develop a service function that queries MarketingOS for recent `campaign_event_log` data (e.g., last 24 hours).
*   Develop a service function that queries LifeOS for the same `campaign_event_log` data.
*   Implement a comparison algorithm to identify missing records, mismatched fields, or unexpected entries.
*   Return a structured report detailing the verification status and any identified discrepancies.

## 3. Exact Safe-Scope Files to Touch First

*   `builderos/src/routes/marketingos-proof.js` (New file: Defines `GET /builderos/v1/proof/marketingos/g133-100/sync-status`)
*   `builderos/src/services/marketingosProofService.js` (New file: Contains `verifyCampaignEventLogSync` function)
*   `builderos/src/data/marketingosProofRepository.js` (New file: Contains data access logic for both MarketingOS and LifeOS `campaign_event_log` data necessary for verification)
*   `builderos/src/app.js` (Modification: Import and register `marketingos-proof.js` route)

## 4. Verifier/Runtime Checks

1.  **API Call:** Execute `GET /builderos/v1/proof/marketingos/g133-100/sync-status`.
2.  **Expected Response Structure:**
    ```json
    {
      "proofId": "g133-100",
      "status": "verified", // or "discrepancies_found"
      "timestamp": "2023-10-27T10:00:00Z",
      "checkedRecordsCount": 1500,
      "discrepancies": [
        // Example discrepancy:
        // {
        //   "type": "missing_in_lifeos",
        //   "source": "marketingos",
        //   "recordId": "campaign_event_123",
        //   "details": "Campaign event 'UserClickedAd' for campaign 'PromoX' not found in LifeOS."
        // },
        // {
        //   "type": "data_mismatch",
        //   "source": "marketingos",
        //   "recordId": "campaign_event_456",
        //   "field": "eventTimestamp",
        //   "expectedLifeOSValue": "2023-10-26T14:30:00Z",
        //   "actualLifeOSValue": "2023-10-26T14:35:00Z"
        // }
      ]
    }
    ```
3.  **Success Condition:** The `status` field in the response is `"verified"` and the `discrepancies` array is empty.
4.  **Test Data:** Ensure a known set of `campaign_event_log` records are created in MarketingOS and subsequently synchronized (or expected to be synchronized) to LifeOS. Verify the endpoint correctly reports `"verified"` for these records. Introduce a deliberate discrepancy (e.g., modify a record directly in MarketingOS without sync, or delete one from LifeOS) and verify the endpoint correctly reports `"discrepancies_found"` with the expected details.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If the `GET /builderos/v1/proof/marketingos/g133-100/sync-status` endpoint returns a 5xx error.
*   If the `status` field in the response is `"discrepancies_found"` and the `discrepancies` array is not empty, indicating data integrity issues between MarketingOS and LifeOS SSOT.
*