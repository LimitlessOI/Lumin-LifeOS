<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G1047 100. -->

Proof-Closing Blueprint Note: MarketingOS Campaign Definition SSOT Foundation (g1047-100)
1. Exact missing implementation or proof gap:
The current MarketingOS platform lacks a direct, immutable ledgering mechanism for `CampaignDefinition` entities within the LifeOS core data ledger. While `CampaignDefinition` data is managed within MarketingOS, there is no explicit, auditable SSOT record established in LifeOS for foundational campaign metadata. This gap prevents downstream systems from reliably sourcing `CampaignDefinition` state changes from a single, immutable truth.
2. Smallest safe build slice to close it:
Implement a `CampaignDefinitionLedgerService` within the `marketingos-core` module. This service will subscribe to `CampaignDefinition` lifecycle events (e.g., `CampaignDefinitionCreated`, `CampaignDefinitionUpdated`) emitted by the `CampaignDefinitionRepository`. Upon receiving an event, it will construct a canonical `MarketingOSCampaignDefinitionLedgerEntry` and publish it to a dedicated `marketingos.campaign_definition` stream in the LifeOS Ledger via `LedgerStreamPublisher`. This ensures every significant state change of a `CampaignDefinition` is immutably recorded as an SSOT event.
3. Exact safe-scope files to touch first:
-   `services/marketingos/src/core/campaign/CampaignDefinitionLedgerService.js` (new)
-   `services/marketingos/src/core/campaign/CampaignDefinitionEvents.js` (extend with new event types if not present, e.g., `CampaignDefinitionCreatedEvent`, `CampaignDefinitionUpdatedEvent`)
-   `services/marketingos/src/core/campaign/CampaignDefinitionRepository.js` (modify to emit `CampaignDefinitionCreatedEvent` and `CampaignDefinitionUpdatedEvent` after successful persistence)
-   `services/lifeos/src/ledger/LedgerStreamPublisher.js` (verify existing `publish` method supports dynamic stream names; no modification expected if generic)
-   `services/lifeos/src/ledger/schemas/MarketingOSCampaignDefinitionLedgerEntry.js` (new, define JSON schema for the ledger entry)
-   `services/marketingos/src/index.js` (register `CampaignDefinitionLedgerService` for initialization)
4. Verifier/runtime checks:
-   Unit Tests: `CampaignDefinitionLedgerService.test.js` to confirm correct event subscription, ledger entry construction, and `LedgerStreamPublisher` invocation with expected payload and stream name.
-   Integration Tests:
    1.  Create a new `CampaignDefinition` via the MarketingOS API.
    2.  Query the LifeOS Ledger API for entries on the `marketingos.campaign_definition` stream, filtering by the newly created `campaignId`.
    3.  Assert that a `MarketingOSCampaignDefinitionLedgerEntry` exists, matches the expected structure, and accurately reflects the campaign's initial state.
    4.  Update the `CampaignDefinition` via the MarketingOS API.
    5.  Repeat step 2 and 3, asserting a new ledger entry reflects the updated state.
-   Observability: Monitor `marketingos.campaign_definition` ledger stream metrics for successful entry publication and data integrity checks (e.g., schema validation success rates).
5. Stop conditions if runtime truth disagrees:
-   If `CampaignDefinitionLedgerService` fails to initialize or subscribe to `CampaignDefinition` events.
-   If `CampaignDefinitionCreatedEvent` or `CampaignDefinitionUpdatedEvent` are not emitted by `CampaignDefinitionRepository` upon successful operations.
-   If `MarketingOSCampaignDefinitionLedgerEntry` is not published to the LifeOS Ledger within 500ms of a successful MarketingOS campaign operation.
-   If published ledger entries are malformed, incomplete, or contain incorrect data compared to the MarketingOS source.
-   If the LifeOS Ledger service reports errors or rejections for `marketingos.campaign_definition` stream entries.