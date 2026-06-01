# AMENDMENT_41_MARKETINGOS - Proof Closing Note: G76-100 (SSOT Foundation)

This document outlines the proof-closing strategy for gap G76-100, ensuring the SSOT foundation for MarketingOS data integration as defined in AMENDMENT_41_MARKETINGOS.md.

## 1. Exact Missing Implementation or Proof Gap

The current gap (G76-100) is the lack of end-to-end verification that `marketingos.campaign.conversion` events, once ingested, are correctly processed by the `MarketingEventProcessor` service and persisted into the `marketing_events` database table with all required attributes (`campaignId`, `userId`, `conversionType`, `timestamp`). While the ingestion pipeline is established, the specific proof of correct transformation and persistence for this critical event type is pending.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Adding a new handler or extending an existing one within the `MarketingEventProcessor` to specifically log and persist `marketingos.campaign.conversion` events.
*   Implementing a dedicated integration test that simulates the ingestion of a `marketingos.campaign.conversion` event and asserts its presence and correctness in the `marketing_events` table.
*   Ensuring the `marketing_events` table schema supports all required attributes for this event type.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/MarketingEventProcessor.js`: Extend event handling logic for `marketingos.campaign.conversion`.
*   `src/models/MarketingEvent.js`: Verify or update the schema definition for `marketing_events` table (if using an ORM) to include `conversionType`.
*   `src/tests/integration/marketingos.test.js`: Add a new test case for `marketingos.campaign.conversion` event persistence.
*   `src/config/event-schemas/marketingos.campaign.conversion.json`: (If schema validation is in place) Ensure the schema is