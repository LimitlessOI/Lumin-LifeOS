The instruction to write a .md file conflicts with the OIL verifier's rejection of .md files as unknown file extensions for Node.js execution.
Proof-Closing Blueprint Note: MarketingOS Integration (g509-100)
Source Blueprint: `docs/projects/AMENDMENT_41_MARKETINGOS.md`
Signal: This document — SSOT foundation.
This blueprint note addresses the proof gap for `g509-100`, focusing on the verified end-to-end flow of `marketingCampaignEnrollment` events from LifeOS to MarketingOS.
---
1. Exact Missing Implementation or Proof Gap
The current system lacks a verified end-to-end flow for `marketingCampaignEnrollment` events originating from LifeOS and being successfully received and processed by MarketingOS. Specifically, the proof that MarketingOS successfully receives and processes these events with the correct payload and attribution is missing. This gap prevents establishing `marketingCampaignEnrollment` as a reliable SSOT event for MarketingOS.
2. Smallest Safe Build Slice to Close It
Implement a lightweight event publisher within LifeOS that dispatches `marketingCampaignEnrollment` events to a dedicated `MarketingIntegrationService`. This service will be responsible for formatting and transmitting the event payload to the configured MarketingOS endpoint. Concurrently, a robust integration test will be developed to simulate an enrollment, trigger the event, and assert its successful (mocked) transmission and expected payload structure. This slice focuses purely on event emission and verified transmission, not on MarketingOS-side processing logic beyond receipt.
3. Exact Safe-Scope Files to Touch First
-   `src/events/marketingEvents.js`: Define the `marketingCampaignEnrollment` event schema and payload structure.
-      `src/services/marketingIntegrationService.js`: Create a new service responsible for handling the dispatch of marketing events to MarketingOS. This service will encapsulate the API call logic.
-   `src/features/campaignEnrollment/campaignEnrollmentController.js`: Modify the existing controller (or relevant business logic) to trigger the `marketingCampaignEnrollment` event via the `MarketingIntegrationService` upon successful user enrollment.
-   `tests/integration/marketingOS.test.js`: Add a new integration test file to simulate a user enrollment and verify that `MarketingIntegrationService` is invoked with the correct data and that the (mocked) MarketingOS endpoint receives the expected event.
4. Verifier/Runtime Checks
-   Unit Test (`marketingIntegrationService.test.js`): Verify that `MarketingIntegrationService` correctly formats the `marketingCampaignEnrollment` event payload according to MarketingOS API specifications and attempts to send it to the configured endpoint. Mock the external API call to ensure service logic is sound.
-   Integration Test (`tests/integration/marketingOS.test.js`): Simulate a user enrolling in a campaign via the LifeOS API. Assert that the `MarketingIntegrationService` is called with the correct `userId`, `campaignId`, and `timestamp`. Further, assert that the (mocked) MarketingOS endpoint receives a valid HTTP request containing the expected event data.
-   Runtime Check (Dev/Staging Environment): After deploying the build slice, perform a manual user enrollment in a test campaign. Monitor network traffic (e.g., using browser dev tools or proxy logs) and/or MarketingOS integration logs (if accessible) to confirm the successful transmission and receipt of the `marketingCampaignEnrollment` event with the correct payload.
5. Stop Conditions if Runtime Truth Disagrees
-   If `tests/integration/marketingOS.test.js` fails consistently, indicating a breakdown in the event emission or transmission logic.
-   If, during manual runtime checks in Dev/Staging, MarketingOS integration logs (or equivalent monitoring) do not show the expected `marketingCampaignEnrollment` event receipt within 5 minutes of a LifeOS enrollment action.
-   If the event payload received by MarketingOS is malformed, incomplete, or missing critical data points (e.g., `userId`, `campaignId`, `enrollmentTimestamp`) as defined in `src/events/marketingEvents.js`.
-   If the `MarketingIntegrationService` logs indicate repeated failures or errors when attempting to dispatch events to MarketingOS.