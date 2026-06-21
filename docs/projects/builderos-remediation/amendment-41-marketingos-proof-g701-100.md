<!-- SYNOPSIS: Amendment 41: MarketingOS Proof G701-100 - SSOT Foundation Blueprint Note -->

# Amendment 41: MarketingOS Proof G701-100 - SSOT Foundation Blueprint Note

This document establishes the Single Source of Truth (SSOT) for closing the proof gap related to MarketingOS integration under Amendment 41, specifically for proof point G701-100. It outlines the exact missing implementation, the smallest safe build slice, target files, verification steps, and stop conditions.

## 1. Exact Missing Implementation or Proof Gap

The current state lacks a verifiable, auditable, and real-time linkage between specific MarketingOS campaign conversion events and their corresponding impact on LifeOS user engagement metrics. Specifically, there is no direct, programmatic proof that a user's engagement score in LifeOS accurately reflects their interaction with a MarketingOS-driven conversion event (e.g., a specific call-to-action completion). The gap is the absence of an automated, idempotent mechanism to ingest MarketingOS conversion signals, attribute them to LifeOS users, and update a designated engagement metric, along with a clear audit trail.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice focuses on integrating a single, high-priority MarketingOS conversion event (e.g., `MarketingOS.CampaignX.ConversionComplete`) and its direct impact on a single LifeOS user engagement metric (`user.engagementScore`).

This slice involves:
1.  **Event Ingestion:** Create an endpoint or message queue listener in LifeOS to receive `MarketingOS.CampaignX.ConversionComplete` events.
2.  **User Attribution:** Map the incoming MarketingOS user identifier to a LifeOS `userId`.
3.  **Metric Update:** Increment `user.engagementScore` by a predefined value (e.g., `+5`) for the attributed LifeOS user.
4.  **Audit Logging:** Record the event ingestion, user attribution, and engagement score update in an auditable log.
5.  **Idempotency:** Ensure that reprocessing the same event does not lead to duplicate score increments.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketing/marketingEventProcessor.js`: New module to handle incoming MarketingOS events, including parsing, attribution, and orchestration of updates.
*   `src/services/user/userEngagementService.js`: Existing service, extend with a new method `updateEngagementScoreFromMarketingEvent(userId, eventType, value)` to encapsulate the score update logic.
*   `src/models/user.js`: Existing Mongoose/ORM model, ensure `engagementScore` field exists and is correctly typed (e.g., `Number`, default `0`).
*   `src/utils/auditLogger.js`: Existing utility, add specific log types for `MarketingOS_Conversion_Processed` and `User_Engagement_Updated_By_Marketing`.
*   `src/routes/webhooks/marketingOS.js`: New webhook endpoint (if using HTTP push) or `src/consumers/marketingOSQueueConsumer.js` (if using message queue) to receive raw events and pass to `marketingEventProcessor`.
*   `src/tests/unit/marketingEventProcessor.test.js`: New unit tests for the processor logic.
*   `src/tests/integration/marketingOSIntegration.test.js`: New integration tests simulating an end-to-end event flow.

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `marketingEventProcessor.test.js`: Verify correct parsing of MarketingOS event payloads.
    *   `userEngagementService.test.js`: Verify `updateEngagementScoreFromMarketingEvent` correctly increments the score and handles edge cases (e.g., non-existent user).
*   **Integration Tests:**
    *   `marketingOSIntegration.test.js`: Simulate a `MarketingOS.Campaign