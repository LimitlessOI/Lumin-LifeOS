<!-- SYNOPSIS: Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G193-100 Remediation -->

# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G193-100 Remediation

This document serves as the SSOT foundation for closing the proof gap identified during the OIL verifier rejection for Amendment 41, specifically concerning MarketingOS proof `g193-100`.

## 1. Exact Missing Implementation or Proof Gap

The final data synchronization handshake between BuilderOS's `MarketingDataIngestor` and the MarketingOS `CampaignProofService` is not fully established for `g193-100` campaigns. Specifically, the `proof_g193_100_status` field is not reliably updated in the BuilderOS `CampaignArtifacts` store after successful MarketingOS processing, leading to intermittent proof generation failures or stale status reporting. The BuilderOS internal message bus listener for `marketingos.campaign.g193_100.proof_status_update` is either missing or incorrectly configured to persist the status.

## 2. Smallest Safe Build Slice to Close It

Implement the missing or correct the existing event listener within BuilderOS's `MarketingDataIngestor` to subscribe to the `marketingos.campaign.g193_100.proof_status_update` topic on the internal message bus. This listener must correctly parse the incoming status payload and invoke the appropriate update method on the `CampaignArtifactsStore` to persist the `proof_g193_100_status` for the relevant campaign ID.

## 3. Exact Safe-Scope Files to Touch First

*   `src/builder-os/services/MarketingDataIngestor.js` (Add/correct message bus subscription and handler logic)
*   `src/builder-os/data/CampaignArtifactsStore.js` (Verify or add a method for atomic `proof_g193_100_status` updates)
*   `src/builder-os/config/messageBusTopics.js` (Confirm `marketingos.campaign.g193_100.proof_status_update` topic definition)
*   `src/builder-os/services/MarketingDataIngestor.test.js` (Add unit tests for the new listener)

## 4. Verifier/Runtime Checks

*   **Unit Test:** Add a new unit test case to `src/builder-os/services/MarketingDataIngestor.test.js`. This test should mock the internal message bus, simulate a `marketingos.campaign.g193_100.proof_status_update` message, and assert that `CampaignArtifactsStore.updateProofStatus` (or equivalent) is called with the correct campaign ID and `proof_g193_100_status` (e.g., 'COMPLETED', 'VERIFIED').
*   **Integration Test (BuilderOS Staging):**
    1.  Trigger a simulated `g193-100` campaign proof generation flow via the BuilderOS internal API in a staging environment.
    2.  Monitor the BuilderOS `CampaignArtifacts` store for the specific campaign ID.
    3.  Verify that the `proof_g193_100_status` field transitions from `IN_PROGRESS` to `COMPLETED` or `VERIFIED` within the expected timeframe (e.g., 2 minutes) after MarketingOS reports completion.
*   **Log Monitoring:** Monitor BuilderOS logs for `MarketingDataIngestor` for successful status update messages (e.g., `INFO: g193-100 proof status updated to COMPLETED`) and the absence of `ERROR: marketingos_g193_100_status_sync_failure` or `WARN: unknown_marketingos_status_payload` messages.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Unit Test Failure:** If the new unit tests in `MarketingDataIngestor.test.js` fail, indicating a fundamental issue with message handling or data persistence logic.
*   **Stale Status:** If, during integration testing, the `proof_g193_100_status` for `g193-100` campaigns consistently remains in an `IN_PROGRESS` or `FAILED` state in `CampaignArtifacts` after MarketingOS has reported successful completion.
*   **Error Log Spike:** A significant increase in `ERROR: marketingos_g193_100_status_sync_failure` or `WARN: unknown_marketingos_status_payload` entries in BuilderOS logs after deployment to staging.
*   **Performance Degradation:** Any measurable degradation in BuilderOS message bus processing latency or `CampaignArtifactsStore` write operations directly attributable to this change.