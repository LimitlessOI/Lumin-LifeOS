# Proof-Closing Blueprint Note: Amendment 41 MarketingOS SSOT Foundation (G561-100)

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

This blueprint note addresses the implementation gap for establishing the Single Source of Truth (SSOT) for MarketingOS campaign data, as outlined in Amendment 41. The amendment defines the conceptual data model for `MarketingCampaign` and `CampaignEvent` entities, but the underlying persistence and API exposure are not yet realized.

---

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a concrete data layer and a read-only API surface for the `MarketingCampaign` and `CampaignEvent` SSOT. Specifically:
*   No database schema or migration exists to persist `MarketingCampaign` and `CampaignEvent` data.
*   No ORM models or repository layer are implemented to interact with these entities.
*   No GraphQL query is available to retrieve `MarketingCampaign` data, including its associated `CampaignEvent` stream.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice focuses on establishing the foundational SSOT persistence and a minimal read-only API:
1.  **Database Schema & Migration:** Create a new database migration to define `marketing_campaigns` and `campaign_events` tables, including necessary fields (e.g., `id`, `name`, `status` for campaigns; `id`, `campaign_id`, `type`, `timestamp`, `payload` for events).
2.  **ORM Models:** Implement `MarketingCampaign` and `CampaignEvent` ORM models (e.g., Sequelize/Prisma models) with appropriate associations.
3.  **Repository Layer:** Develop a basic `MarketingCampaignRepository` with methods for fetching campaigns by ID and their associated events.
4.  **GraphQL Read-Only API:** Extend the existing GraphQL schema to include a `marketingCampaign(id: ID!)` query that resolves to a `MarketingCampaign` type, which in turn exposes its `events` field.

### 3. Exact Safe-Scope Files to Touch First

*   `src/data/migrations/YYYYMMDDHHMMSS_create_marketing_campaign_ssot.js` (New file: Database migration script)
*   `src/data/models/MarketingCampaign.js` (New file: ORM model for MarketingCampaign)
*   `src/data/models/CampaignEvent.js` (New file: ORM model for CampaignEvent)
*   `src/data/repositories/MarketingCampaignRepository.js` (New file: Repository for MarketingCampaign data access)
*   `src/graphql/schemas/marketingCampaignSchema.js` (New file: GraphQL schema definition for MarketingCampaign and CampaignEvent types, and the `marketingCampaign` query)
*   `src/graphql/resolvers/marketingCampaignResolver.js` (New file: GraphQL resolvers for the new types and query)
*   `src/graphql/index.js` (Modification: Import and merge new schema/resolvers)

### 4. Verifier/Runtime Checks

*   **Database Migration:** Execute `npm run db:migrate` (or equivalent). Verify that `marketing_campaigns` and `campaign_events` tables are created successfully in the development database.
*   **GraphQL Introspection:** Run a GraphQL introspection query against the `/graphql` endpoint. Confirm the presence of `MarketingCampaign` and `CampaignEvent` types, and the `marketingCampaign(id: ID!)` query.
*   **Basic Query Test:** Execute a sample GraphQL query:
    ```graphql
    query GetMarketingCampaign {
      marketingCampaign(id: "test-campaign-id") {
        id
        name
        status
        events {
          id
          type
          timestamp
          payload
        }
      }
    }
    ```
    Verify that the query executes without server errors and returns a structure matching the defined types (even if data is null/empty initially).
*   **Unit Tests:** Ensure new repository methods have basic unit test coverage.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Migration Failure:** If the database migration fails or results in an inconsistent schema.
*   **GraphQL Schema Errors:** If the GraphQL server fails to start, or introspection reveals errors related to the new schema definitions.
*   **Query Execution Errors:** If the `marketingCampaign` query consistently returns server errors (e.g., 500 status codes) or malformed responses, indicating issues in resolvers or data access.
*   **Performance Regression:** If the introduction of new models/resolvers causes a measurable performance degradation in