# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G1067-100

This document serves as the SSOT foundation for closing the proof gap related to AMENDMENT_41_MARKETINGOS, specifically focusing on the verified transmission of `UserEngagementScore` (UES) updates from LifeOS to MarketingOS.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a verified, production-ready mechanism and corresponding runtime proof that `UserEngagementScore` (UES) updates, as defined by AMENDMENT_41, are reliably calculated within LifeOS and successfully transmitted to and processed by MarketingOS. Specifically, the proof of successful data ingestion and application within MarketingOS is missing.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Implementing a dedicated internal API endpoint within LifeOS to expose the calculated `UserEngagementScore` for a given `userId`.
*   Developing a lightweight, event-driven mechanism (e.g., a message queue producer) within LifeOS that triggers UES updates to MarketingOS upon significant user activity changes or on a scheduled basis.
*   Implementing a corresponding consumer within MarketingOS (or an existing integration layer) to receive and apply these UES updates.
*   Establishing end-to-end logging and observability for the UES transmission pipeline.

This slice avoids modifying core user-facing features and focuses solely on the internal data flow required by AMENDMENT_41.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/userEngagementService.js`: (New file) Encapsulates UES calculation logic.
*   `src/routes/internal/marketingos.js`: (New or existing internal route) Defines an endpoint `/internal/marketingos/user-engagement/:userId` to retrieve UES.
*   `src/events/producers/userEngagementProducer.js`: (New file) Handles publishing UES updates to a message queue (e.g., Kafka, RabbitMQ).
*   `src/tests/integration/marketingosUES.test.js`: (New file) Integration tests for the UES transmission flow.
*   `src/config/featureFlags.js`: (Existing file) Add a feature flag `marketingosUESIntegrationEnabled`.

## 4. Verifier/Runtime Checks

1.  **LifeOS Internal API Check:**
    *   **Method:** `GET /internal/marketingos/user-engagement/:userId`
    *   **Expected Response:** `200 OK` with a JSON body `{ "userId": "...", "userEngagementScore": NNN, "timestamp": "..." }`.
    *   **Verification:** Ensure the score is a valid number and reflects recent user activity.
2.  **Message Queue Monitoring:**
    *   **Tool:** Kafka/RabbitMQ monitoring dashboards.
    *   **Verification:** Observe `user_engagement_updates` topic/queue for message volume and successful delivery to MarketingOS consumer.
3.  **MarketingOS Log Verification:**
    *   **Tool:** MarketingOS logging system (e.g., Splunk, ELK).
    *   **Search Pattern:** Look for `MarketingOS_UES_Ingestion_Success` or similar log entries for specific `userId`s.
    *   **Verification:** Confirm successful parsing and application of UES data.
4.  **MarketingOS Database Check:**
    *   **Tool:** Direct database query on MarketingOS user profiles table.
    *   **Query:** `SELECT user_engagement_score FROM marketingos.user_profiles WHERE user_id = :userId;`
    *   **Verification:** The `user_engagement_score` column for the test `userId` should reflect the transmitted value.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **API Endpoint Failure:** If `GET /internal/marketingos/user-engagement/:userId` consistently returns non-200 status codes or incorrect data.
*   **Message Queue Backlog/Errors:** If the `user_engagement_updates` topic/queue shows persistent backlogs, producer errors, or consumer failures.
*   **MarketingOS Ingestion Errors:** If MarketingOS logs indicate repeated failures to ingest or process UES updates (e.g., schema mismatches, data validation errors).
*   **Data Discrepancy:** If the `user_engagement_score` in the MarketingOS database does not match the value transmitted from LifeOS after a reasonable propagation delay.
*   **Performance Degradation:** If the new UES calculation or transmission logic introduces unacceptable latency or resource consumption in LifeOS.