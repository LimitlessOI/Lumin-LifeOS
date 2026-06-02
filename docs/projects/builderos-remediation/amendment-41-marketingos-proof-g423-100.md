# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Event Emission Verification (g423-100)

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

This blueprint note details the closure of proof gap `g423-100`, focusing on the end-to-end verification of the `marketingos.campaign.viewed` event emission as specified by AMENDMENT_41_MARKETINGOS.

---

### 1. Exact Missing Implementation or Proof Gap

The proof gap `g423-100` is the lack of verified end-to-end data flow for the `marketingos.campaign.viewed` event. Specifically, it requires confirmation that:
a. The event is correctly triggered from the MarketingOS UI when a user views a campaign.
b. The event payload adheres to the defined schema (e.g., `campaignId`, `userId`, `timestamp`).
c. The event is successfully ingested and processed by the LifeOS analytics pipeline.
d. The event data is queryable and visible in the designated analytics dashboards.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
a. **Event Triggering:** Ensuring the `marketingos.campaign.viewed` event is emitted from the primary campaign viewing component in MarketingOS. This typically involves adding an event dispatch call within the component's lifecycle or a specific user interaction handler.
b. **Payload Construction:** Verifying the event payload is correctly assembled with all required attributes (`campaignId`, `userId`, `timestamp`, etc.) before dispatch.
c. **Analytics Ingestion Path:** Confirming the event reaches the analytics service and is processed without errors. This is primarily a verification step, assuming the ingestion pipeline is already robust.
d. **Dashboard Visibility:** Validating that the processed event data appears in the relevant analytics dashboards or data stores.

### 3. Exact Safe-Scope Files to Touch First

*   `apps/marketingos/src/components/CampaignDetailView.jsx` (or equivalent component responsible for displaying a single campaign)
    *   *Action:* Add or verify `eventBus.emit('marketingos.campaign.viewed', { campaignId: campaign.id, userId: currentUser.id, ... });` within `useEffect` or `componentDidMount` after campaign data is loaded.
*   `packages/events/src/marketingos-events.js` (if event schemas are centrally defined)
    *   *Action:* Review/confirm the `marketingos.campaign.viewed` event schema definition.
*   `apps/analytics-service/src/handlers/marketingos-event-handler.js` (or relevant ingestion endpoint handler)
    *   *Action:* Add logging to confirm receipt and parsing of `marketingos.campaign.viewed` events.
*   `apps/analytics-service/src/schemas/marketingos-event-schema.json` (if schema validation occurs at ingestion)
    *   *Action:* Review/confirm the validation schema for `marketingos.campaign.viewed`.

### 4. Verifier/Runtime Checks

*   **Browser Network Tab:**
    *   Navigate to a MarketingOS campaign detail page.
    *   Inspect network requests for an event payload matching `marketingos.campaign.viewed` being sent to the analytics endpoint.
    *   Verify the payload structure and data correctness (e.g., `campaignId` matches the viewed campaign).
*   **Analytics Service Logs:**
    *   Monitor `apps/analytics-service` logs for successful ingestion messages related to `marketingos.campaign.viewed` events.
    *   Check for any parsing or validation errors.
*   **Analytics Dashboard/Data Store:**
    *   Access the designated analytics dashboard (e.g., Amplitude, Mixpanel, internal BI tool).
    *   Query for `marketingos.campaign.viewed` events.
    *   Verify event counts, user properties, and campaign IDs are accurate and incrementing as expected