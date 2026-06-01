AMENDMENT_41_MARKETINGOS Proof-Closing Blueprint Note: G36-100 Campaign Status Integration
Source Blueprint: `docs/projects/AMENDMENT_41_MARKETINGOS.md`
Signal: This document — SSOT foundation.
This blueprint note serves as the Single Source of Truth (SSOT) for closing the proof gap related to the G36-100 campaign status integration as outlined in `AMENDMENT_41_MARKETINGOS.md`. It details the verification steps to confirm the successful implementation and operational readiness of the specified internal data flow.
---
1.  Exact Missing Implementation or Proof Gap
    The specific proof gap is the verified operational status of the internal apiEP and associated service logic responsible for receiving and persisting campaign status updates from MarketingOS. This includes confirming:
-   The `/api/v1/marketingos/campaign-status` endpoint is accessible and accepts POST requests.
-   The endpoint correctly processes the expected JSON payload for campaign status.
-   The processed data is accurately persisted into the `marketing_campaign_statuses` internal db table.
-   No unexpected errors or data integrity issues arise during this process.
2.  Smallest Safe Build Slice to Close It
    The smallest safe build slice involves executing a targeted integration test or a BuilderOS-controlled script that simulates a MarketingOS campaign status update. This slice will:
    1.  Construct a valid sample JSON payload for a campaign status update.
    2.  Issue a POST request to the `/api/v1/marketingos/campaign-status` endpoint.
    3.  Verify the HTTP response code.
    4.  Query the `marketing_campaign_statuses` db table to confirm the presence and correctness of the newly inserted record.
    This slice is read-only from the perspective of core application logic, focusing solely on observation and verification.
3.  Exact Safe-Scope Files to Touch First
    To implement this proof, the following files are within safe scope and should be touched first:
-   `tests/integration/marketingos/campaignStatus.test.js` (New file for automated integration test)
-   `src/utils/test-helpers/db.js` (If db interaction helpers are needed for testing)
       `src/api/v1/marketingos/campaignStatus.js` (To review the handler logic, though not directly modified for the proof* itself, it's the target of verification)
4.  Verifier/Runtime Checks
    The following checks must pass for the proof to be considered closed:
-   API Endpoint Reachability & Response: A POST request to `/api/v1/marketingos/campaign-status` with a valid `CampaignStatusUpdate` payload (e.g., `{"campaignId": "G36-100", "status": "ACTIVE", "timestamp": "2023-10-27T10:00:00Z"}`) must return an HTTP 200 OK or 201 Created status.
-   Database Persistence: A subsequent query to the `marketing_campaign_statuses` table must retrieve a record matching the `campaignId` and `status` from the submitted payload. The `timestamp` and any other relevant fields must also match or be correctly derived.
-   Error Logging: No critical or error-level logs related to the `/api/v1/marketingos/campaign-status` endpoint should be observed during the test execution.
5.  Stop Conditions if Runtime Truth Disagrees
    The build pass must halt and be flagged for immediate human review if any of the following conditions are met:
-   The `/api/v1/marketingos/campaign-status` endpoint is unreachable, returns a non-2xx HTTP status code, or throws an unhandled exception.
-   The `marketing_campaign_statuses` db table does not contain the expected record after a successful API call, or the retrieved record's data is inconsistent with the submitted payload.
-   The integration test `tests/integration/marketingos/campaignStatus.test.js` fails for any reason.
-   Unexpected data integrity issues or performance degradation are observed in related systems during or after the test.
    In such cases, the root cause in the API handler, db schema, or data persistence logic must be identified and remediated before proceeding.