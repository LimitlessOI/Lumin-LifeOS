# Amendment 41 MarketingOS Proof G29-100: Proof-Closing Blueprint Note

**SSOT Foundation Document**

This document outlines the necessary steps to close the proof gap identified for Amendment 41, specifically concerning MarketingOS integration, as per verification G29-100.

## 1. Exact Missing Implementation or Proof Gap

The primary gap identified is the lack of a verifiable, runtime-attested link between the `MarketingOS` campaign activation signal and the `BuilderOS` execution log for `Amendment 41` specific build parameters. The current system allows `MarketingOS` to trigger `Amendment 41` builds, but there is no direct, immutable record within `BuilderOS` that explicitly ties a specific `MarketingOS` campaign ID to a `BuilderOS` job ID and its resulting build artifacts, preventing auditable proof of execution alignment.

## 2. Smallest Safe Build Slice to Close It

Introduce a new `BuilderOS` internal logging mechanism that captures `MarketingOS` campaign metadata (specifically `campaignId` and `triggerEventId`) upon `Amendment 41` build initiation. This metadata must be persisted alongside the `BuilderOS` job ID and build artifact references. This slice focuses solely on internal `BuilderOS` logging and does not expose new APIs or modify existing `LifeOS` user features or `TSOS` customer-facing surfaces.

## 3. Exact Safe-Scope Files to Touch First

*   `services/builder-os/src/jobs/amendment41Processor.js`: Modify the `processAmendment41Build` function to accept and log `marketingCampaignId` and `marketingTriggerEventId` parameters.
*   `services/builder-os/src/data/buildLogRepository.js`: Update the `createBuildLogEntry` function to include new fields for `marketingCampaignId` and `marketingTriggerEventId`.
*   `services/builder-os/src/schemas/buildLogSchema.js`: Add `marketingCampaignId` (string) and `marketingTriggerEventId` (string) to the build log schema.

## 4. Verifier/Runtime Checks

*   **Unit Test:** Verify that `amendment41Processor.js` correctly passes `marketingCampaignId` and `marketingTriggerEventId` to `buildLogRepository.js`.
*   **Integration Test:** Simulate a `MarketingOS` trigger for an `Amendment 41` build. Query the `BuilderOS` build log for the resulting job ID and assert that the `marketingCampaignId` and `marketingTriggerEventId` fields are populated correctly and match the input.
*   **Runtime Observation:** Monitor `BuilderOS` logs for `Amendment 41` builds. Confirm that new log entries contain the expected `marketingCampaignId` and `marketingTriggerEventId` values.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If `marketingCampaignId` or `marketingTriggerEventId` are consistently missing or malformed in `BuilderOS` build logs for `Amendment 41` jobs.
*   If the recorded `marketingCampaignId` or `marketingTriggerEventId` values do not accurately reflect the originating `MarketingOS` trigger events.
*   If the introduction of these fields causes any regression in existing `BuilderOS` build processing or logging functionality.
*   If database schema migration for `buildLogSchema.js` fails or causes data integrity issues.