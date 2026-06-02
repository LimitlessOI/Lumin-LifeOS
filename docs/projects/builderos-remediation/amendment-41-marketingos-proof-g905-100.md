# AMENDMENT_41_MARKETINGOS Proof: G905-100 - SSOT Foundation for CampaignEvent Data

This document outlines the proof-closing blueprint note for establishing the Single Source of Truth (SSOT) foundation for `CampaignEvent` data within MarketingOS, as specified by `AMENDMENT_41_MARKETINGOS.md`.

## 1. The exact missing implementation or proof gap

The core gap is the verifiable proof that the `MarketingOS` data synchronization mechanism, as defined in `AMENDMENT_41_MARKETINGOS.md` for establishing a Single Source of Truth (SSOT) for `CampaignEvent` data, is fully operational and maintaining data consistency across integrated systems. Specifically, proving that `CampaignEvent` records originating from `SourceSystemA` are accurately and completely reflected in the `MarketingOS` canonical store and subsequently propagated to `TargetSystemB` without loss or corruption. This proof must confirm data integrity, completeness, and timeliness across the defined SSOT flow.

## 2. The smallest safe build slice to close it

Implement a lightweight, read-only `CampaignEvent` data integrity verification endpoint within the `BuilderOS` internal API. This endpoint will:
1.  Query a sample set of `CampaignEvent` records from `MarketingOS`'s canonical store.
2.  Utilize existing read-only integration points to fetch corresponding records from `SourceSystemA` and `TargetSystemB`.
3.  Perform a deep comparison of key attributes (e.g., `eventName`, `timestamp`, `associatedCampaignId`, `status`, `metadataHash`) across the three sources.
4.  Report a `consistencyScore` (0.0-1.0) and a `status` (`PASS`/`FAIL`) based on the comparison.
This slice avoids modifying core `MarketingOS` write paths or customer-facing features, focusing solely on verification.

## 3. Exact safe-scope files to touch first

*   `services/marketing/campaignEventSyncService.js`: Add internal, debug-level logging for `CampaignEvent` sync completion, record counts, and any detected discrepancies during the sync process.
*   `data/models/campaignEventModel.js`: Ensure `read` operations are optimized and consistent for bulk retrieval.
*   `api/builderos/proofEndpoints.js`: Create a new internal endpoint `/builderos/proof/g905-100/campaign-event-ssot-check`. This file will house the logic for the data comparison.
*   `tests/integration/builderos/campaignEventSSOT.test.js`: Add a new integration test suite to automate calls to the proof endpoint and assert expected outcomes.

## 4. Verifier/runtime checks

1.  Execute `GET /builderos/proof/g905-100/campaign-event-ssot-check?sampleSize=100` via `BuilderOS` internal tooling.
2.  Verify the response JSON contains `status: "PASS"` and `consistencyScore: