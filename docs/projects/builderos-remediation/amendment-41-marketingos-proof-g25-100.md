# Amendment 41 MarketingOS Proof G25-100: SSOT Foundation Verification

This blueprint note addresses a critical proof gap in the SSOT foundation for Amendment 41 MarketingOS, focusing on the verifiable propagation of marketing asset metadata updates.

---

### 1. Exact missing implementation or proof gap

The current proof for Amendment 41 MarketingOS's SSOT foundation lacks explicit, automated verification that `MarketingAssetMetadataService`'s updates to asset status (e.g., `active`, `archived`, `pending_review`) are reliably published to the `MarketingEventBus` and subsequently consumed by critical downstream services like `CampaignScheduler` and `ContentPublisher`. The gap is the absence of a dedicated integration test demonstrating this end-to-end data flow and consistency, ensuring that changes at the source are accurately reflected across consuming modules.

### 2. Smallest safe build slice to close it

Implement a new integration test suite (`tests/integration/marketing-asset-sync.integration.test.js`) that simulates an asset metadata update originating from `MarketingAssetMetadataService`. This test will:
1. Trigger an update via `MarketingAssetMetadataService`.
2. Assert that the update is correctly emitted onto the `MarketingEventBus`.
3. Assert that mock instances of `CampaignScheduler` and `ContentPublisher` reliably receive and process the event, reflecting the updated asset status.
This slice focuses purely on testing existing components' interaction and data flow without modifying their core business logic.

### 3. Exact safe-scope files to touch first

-   `tests/integration/marketing-asset-sync.integration.test.js` (new file)
-   `src/services/MarketingAssetMetadataService.js` (for test-time mocking of internal methods or direct invocation)
-   `src/events/MarketingEventBus.js` (for test-time event listener setup and verification)
-   `src/modules/CampaignScheduler.js` (for test-time mocking of event handling methods)
-   `src/modules/ContentPublisher.js` (for test-time mocking of event handling methods)

### 4. Verifier/runtime checks

Execute the newly created integration test suite:
`npm test -- tests/integration/marketing-asset-sync.integration.test.js`

Expected outcomes:
-   All tests within `marketing-asset-sync.integration.test.js` pass successfully.
-   Specific assertions within the test confirm:
    -   `MarketingAssetMetadataService.updateAssetStatus` (or similar method) is invoked with the correct asset ID and new status.
    -   `MarketingEventBus.emit` is called with the expected event type (e.g., `MARKETING_ASSET_UPDATED`) and a payload containing the updated asset metadata.
    -   Mock `CampaignScheduler.handleMarketingAssetUpdate` (or similar event handler) is called with the correct event data.
    -   Mock `ContentPublisher.handleMarketingAssetUpdate` (or similar event handler)