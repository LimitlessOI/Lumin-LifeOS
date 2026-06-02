# AMENDMENT_41_MARKETINGOS Proof-Closing Blueprint Note: G758-100

## 1. Exact Missing Implementation or Proof Gap

The `AMENDMENT_41_MARKETINGOS` blueprint establishes the architectural foundation for MarketingOS as the Single Source of Truth (SSOT). The current gap is the concrete, verifiable proof that a fundamental marketing entity, specifically a `Campaign` record, successfully traverses the core data pipeline (ingestion, transformation, storage) and is consistently retrievable via the `marketing-api-gateway`, thereby demonstrating its SSOT status for this entity. This proof validates the end-to-end data flow for a critical data type.

## 2. Smallest Safe Build Slice to Close It

Implement a minimal, end-to-end data flow for a single `Campaign` record:
1.  **Simulate Ingestion**: Programmatically create and "ingest" a test `Campaign` record into the `marketing-data-ingestor` (e.g., via a direct service call or mock event).
2.  **Transformation & Storage**: Ensure the `marketing-data-transformer` processes this record and the `marketing-data-store` successfully persists it. This relies on existing pipeline logic.
3.  **API Exposure**: Verify the `marketing-api-gateway` exposes a GraphQL query (e.g., `campaign(id: ID!): Campaign`) capable of retrieving this specific `Campaign` record.
4.  **Verification Test**: Develop an automated integration test that performs the simulated ingestion, then queries the `marketing-api-gateway` for the ingested `Campaign` ID, and asserts the retrieved data matches the original ingested data.

## 3. Exact Safe-Scope Files to Touch First

Based on the `AMENDMENT_41_MARKETINGOS` blueprint components and existing patterns:

*   `services/marketing-data-ingestor/src/test-utils/mockCampaignIngest.js` (for simulating ingestion)
*   `services/marketing-data-transformer/src/transformers/campaignTransformer.js` (to ensure existing logic handles the test campaign)
*   `services/marketing-data-store/src/models/Campaign.js` (to confirm schema and ORM mapping)
*   `services/marketing-api-gateway/src/schema/campaign.graphql` (to define the `Campaign` query)
*   `services/marketing-api-gateway/src/resolvers/campaignResolver.js` (to implement the `campaign` query logic)
*   `services/marketing-api-gateway/tests/integration/campaignSSOT.test.js` (for the end-to-end verification test)

## 4. Verifier/Runtime Checks

1.  **Ingestion Acknowledgment**: Confirm `marketing-data-ingestor` logs or returns a success status for the simulated `Campaign` ingestion.
2.  **Database Persistence**: Directly query the `marketing-data-store` (e