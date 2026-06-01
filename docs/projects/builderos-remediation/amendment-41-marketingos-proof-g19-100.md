Amendment 41: MarketingOS Proof G19-100 - Proof-Closing Blueprint Note
This document serves as the Single Source of Truth (SSOT) foundation for closing the proof gap identified for MarketingOS campaign G19-100 within the BuilderOS platform.
1. Exact Missing Implementation or Proof Gap
The final activation and verification step for MarketingOS campaign G19-100 within BuilderOS is currently pending. Specifically, the `marketingCampaignStatus` for `G19-100` in the BuilderOS internal configuration needs to be updated from `pending_proof` to `verified_active`, and a corresponding internal event must be emitted to signal readiness for downstream MarketingOS consumption. This ensures BuilderOS correctly reflects the campaign's operational status and triggers necessary internal data synchronization.
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves a single configuration update and an internal event emission. This change is isolated to BuilderOS internal services and does not impact LifeOS user features or TSOS customer-facing surfaces.
3. Exact Safe-Scope Files to Touch First
-   `services/builder-config-service/src/config/marketingCampaigns.js` (Update `G19-100` status)
-   `services/builder-event-emitter/src/events/marketingCampaignEvents.js` (Add `campaignVerified` event type if not present)
-   `services/builder-event-emitter/src/publishers/internalPublisher.js` (Emit `campaignVerified` event)
-   `services/builder-api/src/routes/internal/marketingProofRoutes.js` (Add or update endpoint to trigger this status change, if manual trigger is required)
4. Verifier/Runtime Checks
1.  Database/Config Check: Verify that the `marketingCampaignStatus` for `G19-100` in the BuilderOS internal configuration store (e.g., `builder_config.marketing_campaigns` table or equivalent) is `verified_active`.
-   `SELECT status FROM builder_config.marketing_campaigns WHERE campaign_id = 'G19-100';`
2.  Log Check: Confirm that a `campaignVerified` event for `G19-100` was successfully emitted by `builder-event-emitter` in the BuilderOS internal event logs.
-   Search BuilderOS internal logs for `event_type: "campaignVerified"` and `campaign_id: "G19-100"`.
3.  Internal API Check (if applicable): If an internal apiEP is used to trigger this, verify its successful execution and response.
-   `GET /builder-api/internal/marketing/campaign/G19-100/status` should return `{"status": "verified_active"}`.
5. Stop Conditions if Runtime Truth Disagrees
-   Status Mismatch: If the `marketingCampaignStatus` for `G19-100` remains `pending_proof` or reverts to an unverified state after the build slice is applied.
-   Event Not Emitted: If no `campaignVerified` event for `G19-100` is observed in the BuilderOS internal event logs within 5 minutes of the build slice deployment.
-   Service Instability: Any observed increase in error rates or latency in `builder-config-service`, `builder-event-emitter`, or `builder-api` after deployment.
-   Rollback: In any of these disagreement scenarios, the build slice must be immediately rolled back, and further investigation initiated to diagnose the root cause before re-attempting the proof closure.