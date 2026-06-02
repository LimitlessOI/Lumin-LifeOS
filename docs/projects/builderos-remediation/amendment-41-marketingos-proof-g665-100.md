Amendment 41: MarketingOS Proof - G665-100
Proof-Closing Blueprint Note
Signal Requiring Follow-Through: This document — SSOT foundation.
This blueprint note outlines the necessary steps to formally close the proof for Amendment 41, ensuring the MarketingOS integration functions as the Single Source of Truth (SSOT) for campaign conversion events within LifeOS.
1. Exact Missing Implementation or Proof Gap
The primary gap is the comprehensive, automated verification that the `marketingos.campaign_conversion` event, as defined in `AMENDMENT_41_MARKETINGOS.md`, is correctly ingested, processed, and persisted within LifeOS, and that all specified data fields are accurately captured and accessible. While the implementation is assumed complete, the proof of its correctness and adherence to the SSOT foundation is pending.
Specifically, the gap is the absence of a dedicated, end-to-end integration test suite that validates:
-   Successful ingestion of the `marketingos.campaign_conversion` event.
-   Accurate parsing and storage of all event properties (`campaignId`, `conversionType`, `userId`, `timestamp`, etc.).
-   Correct linkage of the event to the corresponding LifeOS user profile.
-   Idempotency of event processing.
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves creating a new integration test suite. This suite will simulate the external trigger of a `marketingos.campaign_conversion` event and then programmatically assert the resulting state within LifeOS's internal data stores. This slice is isolated to testing infrastructure and does not modify production code paths.
Key components of this slice:
-   A test runner configuration to execute the new integration tests.
-   A test utility to mock or simulate the MarketingOS event payload and its delivery mechanism (e.g., an API call to an ingestion endpoint or a message queue publish).
-   Assertions against the LifeOS db or analytics service to confirm event presence and data integrity.
3. Exact Safe-Scope Files to Touch First
-   `tests/integration/marketingos/campaignConversion.test.js` (New file)
-   `tests/utils/mockMarketingOSClient.js` (New file, if a dedicated mock client is beneficial for event simulation)
-   `package.json` (Update `scripts` for new test command, if not already covered by a general integration test script)
-   `jest.config.js` or equivalent (Ensure new test path is included in test discovery)
4. Verifier/Runtime Checks
The following checks will be implemented within the integration test suite:
-   Event Ingestion Confirmation:
-   Simulate a `POST` request to `/api/v1/events/marketingos/conversion` with a valid `marketingos.campaign_conversion` payload.
-   Assert that the apiEP returns a `202 Accepted` or `200 OK` status.
-   Data Persistence Verification:
-   Query the `lifeos_events` db table (or equivalent event store) for an event matching the simulated `campaignId` and `userId` within a recent timestamp window.
-   Assert that exactly one such event is found.
-   Assert that all fields (`campaignId`, `conversionType`, `userId`, `timestamp`, `sourceSystem: 'MarketingOS'`) match the simulated input and expected schema.
-   User Linkage Validation:
-   Query the `lifeos_users` table (or equivalent user profile store) for the `userId` associated with the event.
-   Assert that the user's profile reflects any expected updates or linkages resulting from the conversion event (e.g., `lastMarketingConversionDate` or `totalConversions` incremented, if specified in `AMENDMENT_41_MARKETINGOS.md`).
-   Idempotency Test:
-   Repeat the event ingestion simulation with the exact same payload within a short timeframe.
-   Assert that the `lifeos_events` table does not contain duplicate records for the same unique event identifier (if applicable) or that subsequent processing does not lead to incorrect state changes.
5. Stop Conditions if Runtime Truth Disagrees
The proof-closing process will halt and require re-evaluation if any of the following conditions are met during runtime verification:
-   Ingestion Failure: The LifeOS ingestion endpoint returns an error status (`4xx` or `5xx`)