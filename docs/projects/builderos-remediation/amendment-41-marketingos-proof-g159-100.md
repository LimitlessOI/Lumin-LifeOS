<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G159 100. -->

### Proof-Closing Blueprint Note: Amendment 41 - MarketingOS (Proof G159-100)

This document serves as the Single Source of Truth (SSOT) foundation for closing the proof gap identified during the BuilderOS change verification for Amendment 41, related to MarketingOS.

**1. Exact Missing Implementation or Proof Gap:**
The primary gap identified was the lack of a verifiable, runtime-provable link between the MarketingOS campaign definition (as per Amendment 41) and its actual deployment status within the BuilderOS-governed loop. Specifically, the verifier could not confirm that a MarketingOS campaign, once approved and marked for deployment, was correctly reflected in the BuilderOS state without manual intervention or an unverified external signal. The previous rejection (`ERR_UNKNOWN_FILE_EXTENSION` on `.md` file) indicates a tooling misconfiguration rather than a content error, but the underlying *functional* proof gap remains: how to programmatically *prove* the state transition and deployment.

**2. Smallest Safe Build Slice to Close It:**
Introduce a new BuilderOS internal state flag and a corresponding read-only API endpoint within the BuilderOS domain. This flag, `marketingOsCampaignDeploymentStatus`, will be updated by an existing BuilderOS internal worker upon successful orchestration of a MarketingOS campaign deployment. The API endpoint will expose this status for specific campaign IDs. This avoids modifying LifeOS user features or TSOS customer-facing surfaces.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/builder-os/services/campaignDeploymentWorker.js`: Modify existing worker to update `marketingOsCampaignDeploymentStatus` in BuilderOS internal state upon successful deployment.
*   `src/builder-os/api/routes/statusRoutes.js`: Add a new GET endpoint `/builder-os/status/marketing-campaign/:campaignId` to expose the `marketingOsCampaignDeploymentStatus`.
*   `src/builder-os/models/BuilderOsState.js`: Add `marketingOsCampaignDeploymentStatus` field to the internal state model.
*   `docs/builder-os/api-spec.md`: Update API documentation for the new endpoint.

**4. Verifier/Runtime Checks:**
*   **Unit Test:** Verify `campaignDeploymentWorker.js` correctly updates the internal state.
*   **Integration Test:** Simulate a MarketingOS campaign deployment and verify the new `/builder-os/status/marketing-campaign/:campaignId` endpoint returns the expected `deployed` status.
*   **Runtime Check (OIL Verifier):**
    1.  Trigger a test MarketingOS campaign deployment via the BuilderOS orchestration flow.
    2.  Poll `/builder-os/status/marketing-campaign/:campaignId` for the specific test campaign ID.
    3.  Assert that the status transitions from `pending` to `deployed` within a defined timeout.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If the `/builder-os/status/marketing-campaign/:campaignId` endpoint consistently returns `pending` or an error after a successful orchestration signal and timeout, stop the build.
*   If the status endpoint returns an unexpected state (e.g., `failed` without a corresponding failure in orchestration logs), stop the build.
*   If the API endpoint is unreachable or returns a 5xx error, stop the build.
*   If the `campaignDeploymentWorker` logs indicate failures to update the internal state, stop the build.