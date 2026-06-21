<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G165 100. -->

Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Gap G165-100
Source Blueprint: `docs/projects/AMENDMENT_41_MARKETINGOS.md`
Signal: This document — SSOT foundation.

This note addresses the identified proof gap G165-100, focusing on the foundational implementation required to establish a verified, unidirectional data synchronization proof-of-concept from a designated MarketingOS data source into a BuilderOS staging area. This gap prevents the validation of foundational data ingestion patterns and SSOT establishment for MarketingOS entities within BuilderOS.

### 1. Exact Missing Implementation or Proof Gap
The absence of a minimal, end-to-end data pipeline for a single entity type (e.g., `MarketingCampaign` metadata) from MarketingOS to BuilderOS. This includes the lack of:
- A dedicated BuilderOS internal service for MarketingOS data ingestion.
- Defined schema validation for incoming MarketingOS data.
- A temporary BuilderOS staging table for raw or transformed MarketingOS data.
- Basic integrity checks during data transfer.

### 2. Smallest Safe Build Slice to Close It
Implement a new BuilderOS internal service (`MarketingOSSyncService`) responsible for:
- Polling a configured MarketingOS API endpoint (or consuming a webhook) for `MarketingCampaign` metadata.
- Transforming the ingested data to conform to a new BuilderOS internal staging schema.
- Persisting the transformed data to a new, temporary BuilderOS staging table (`marketing_campaign_staging`).
This slice focuses purely on ingestion and initial storage within BuilderOS, without exposing data to LifeOS user features or TSOS customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First
- `services/builderos/marketingos-sync.js`: New ESM module for the `MarketingOSSyncService`.
- `schemas/builderos/marketing-campaign-staging.js`: New Joi/Zod schema definition for `MarketingCampaignStaging` entity.
- `db/migrations/2024XXYY_create_marketing_campaign_staging_table.js`: New Knex migration to create the `marketing_campaign_staging` table.
- `config/builderos.js`: Add `marketingOSApiEndpoint` and `marketingOSApiKey` configuration variables.
- `tests/builderos/marketingos-sync.test.js`: New unit and integration tests for `MarketingOSSyncService`.

### 4. Verifier/Runtime Checks
- **Unit Tests:** All tests in `tests/builderos/marketingos-sync.test.js` pass, verifying data transformation, validation, and persistence logic.
- **Integration Test (Staging):**
    1. Deploy the build slice to a BuilderOS staging environment.
    2. Manually trigger `MarketingOSSyncService.syncCampaigns()`.
    3. Query the `marketing_campaign_staging` table in the BuilderOS staging database. Verify that `MarketingCampaign` data from a mock MarketingOS source is present and correctly structured.
    4. Monitor BuilderOS logs for successful sync operations and absence of data transformation/persistence errors.
- **Schema Validation:** Ensure all ingested data in `marketing_campaign_staging` strictly conforms to `schemas/builderos/marketing-campaign-staging.js`.

### 5. Stop Conditions if Runtime Truth Disagrees
- `marketing_campaign_staging` table is not created or accessible after migration.
- `MarketingOSSyncService` fails to ingest or transform data from the mock MarketingOS source without errors.
- Ingested data consistently fails schema validation against `marketing-campaign-staging.js`.
- The sync process introduces measurable performance degradation (e.g., >5% increase in average BuilderOS API response times or CPU utilization) to existing BuilderOS operations.
- Any attempt by the sync process to write to or modify LifeOS user-facing or TSOS customer-facing tables.