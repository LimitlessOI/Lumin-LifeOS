# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G1081-100

This note addresses the proof gap G1081-100 as defined in AMENDMENT_41_MARKETINGOS.md, ensuring the foundational SSOT for marketing event logging.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the verifiable emission of the `marketing_campaign_impression` event type, ensuring it carries the required `campaignId` and `userId` fields, and is correctly routed to the `marketing_event_stream`. This is a foundational data integrity proof point for subsequent MarketingOS analytics.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
a. Defining the `MARKETING_CAMPAIGN_IMPRESSION` event type constant.
b. Extending the `MarketingEventService` to expose a method, `recordCampaignImpression(campaignId, userId)`, which constructs and emits this event.
c. Ensuring the event payload conforms to the `MarketingEventSchema` (implicitly assumed to exist for validation).

## 3. Exact Safe-Scope Files to Touch First

- `src/services/MarketingEventService.js`: Add `recordCampaignImpression` method.
- `src/constants/marketingEventTypes.js`: Add `MARKETING_CAMPAIGN_IMPRESSION` constant.
- `src/services/__tests__/MarketingEventService.test.js`: Add unit tests for the new method.

## 4. Verifier/Runtime Checks

- **Unit Tests (`MarketingEventService.test.js`):**
    - Verify `recordCampaignImpression` calls the underlying event emitter with the correct event type (`MARKETING_CAMPAIGN_IMPRESSION`).