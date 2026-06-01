Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - G59-100

This document outlines the plan to close the proof gap for `G59-100` as defined in `AMENDMENT_41_MARKETINGOS.md`. The objective is to ensure the accurate and timely synchronization of `UserEngagementScore` for `CampaignSegmentID: 'G59-100-PROMO'` from LifeOS to MarketingOS.

1.  **Exact Missing Implementation or Proof Gap**
    The current LifeOS platform lacks a dedicated mechanism to publish `UserEngagementScore` updates for specific `CampaignSegmentID`s to a MarketingOS-consumable endpoint or message queue. Specifically, the `G59-100-PROMO` campaign requires real-time or near real-time score synchronization to enable dynamic campaign adjustments within MarketingOS. The proof gap is the absence of a verifiable data flow for `UserEngagementScore` from LifeOS's internal user profile service to MarketingOS's ingestion service for this specific campaign segment.

2.  **Smallest Safe Build Slice to Close It**
    Implement a new event publisher within the existing LifeOS `UserEngagementService` that triggers upon `UserEngagementScore` updates for users associated with `CampaignSegmentID: 'G59-100-PROMO'`. This publisher will emit a standardized event containing the `UserID`, `CampaignSegmentID`, and the updated `UserEngagementScore` to an internal message bus (e.g., Kafka topic `lifeos.marketingos.engagement_scores`). This slice focuses solely on the *publishing* side from LifeOS, without touching MarketingOS ingestion or LifeOS user-facing features.

3.  **Exact Safe-Scope Files to Touch First**
    *   `services/UserEngagementService.js`: Add a new method `publishEngagementScoreUpdate(userId, campaignSegmentId, score)` that emits the event. Modify existing score update logic to call this new method when `campaignSegmentId` matches `G59-100-PROMO`.
    *   `config/eventBusTopics.js`: Add a new topic constant `LIFEOS_MARKETINGOS_ENGAGEMENT_SCORES = 'lifeos.marketingos.engagement_scores'`.
    *   `utils/eventPublisher.js`: (Assuming this exists) Extend or ensure a `publish` function exists that can send messages to the configured Kafka topic. If not, create a minimal `utils/kafkaPublisher.js` module.
    *   `tests/services/UserEngagementService.test.js`: Add unit tests to verify that `publishEngagementScoreUpdate` is called with correct parameters when a relevant score update occurs.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** `UserEngagementService.test.js` should pass, specifically verifying the new event publishing logic.
    *   **Integration Test (Local):** Deploy the updated `UserEngagementService` locally. Simulate a `UserEngagementScore` update for a user associated with `G59-100-PROMO`. Verify that a message appears on the `lifeos.marketingos.engagement_scores` Kafka topic with the expected `UserID`, `CampaignSegmentID`, and `UserEngagementScore` payload. Use a Kafka consumer tool (e.g., `kafkacat`) to inspect the topic.
    *   **Schema Validation:** Ensure the emitted event payload conforms to a predefined schema (e.g., JSON schema) for `UserEngagementScoreUpdateEvent`.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If unit tests for `UserEngagementService` fail, stop and debug the service logic.
    *   If no message appears on the `lifeos.marketingos.engagement_scores` topic after a simulated score update, stop and debug the event publishing mechanism (e.g., Kafka connection, `eventPublisher` logic).
    *   If messages appear but have incorrect schema or data, stop and debug the event payload construction.
    *   If the `UserEngagementService` experiences unexpected performance degradation or errors after deployment, immediately roll back the change.