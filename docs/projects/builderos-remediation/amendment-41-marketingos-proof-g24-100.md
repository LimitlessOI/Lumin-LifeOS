# Proof-Closing Blueprint Note: MarketingOS Campaign Performance Integration (G24-100)

This document serves as the Single Source of Truth (SSOT) foundation for closing the proof gap related to MarketingOS integration, specifically focusing on campaign performance data.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of verified end-to-end data flow and display for MarketingOS campaign performance metrics within the LifeOS analytics dashboard. This includes:
*   Secure and reliable ingestion of `CampaignPerformanceEvent` data from MarketingOS into LifeOS.
*   Correct processing and persistence of this data within LifeOS's analytics data store.
*   Accurate rendering and real-time (or near real-time) updates of these metrics in the designated LifeOS UI components.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **API Endpoint:** Creating a new, authenticated POST endpoint in LifeOS to receive `CampaignPerformanceEvent` payloads from MarketingOS.
2.  **Data Ingestion Service:** Implementing a dedicated service to validate, transform, and persist the incoming campaign performance data into the LifeOS analytics database. This service will leverage existing data validation and persistence patterns.
3.  **Analytics Service Extension:** Extending an existing LifeOS analytics service to query and aggregate the newly ingested MarketingOS campaign data.
4.  **UI Component Update:** Modifying the relevant LifeOS analytics dashboard component to fetch and display the aggregated MarketingOS campaign performance metrics.

## 3. Exact Safe-Scope Files to Touch First

*   `src/api/routes/marketingos.js`: Add a new POST route `/marketingos/campaign-performance`.
*   `src/services/marketingos/campaignPerformanceIngestionService.js`: New file for ingestion logic, validation, and persistence.
*   `src/db/models/CampaignPerformance.js`: New Mongoose/Sequelize model definition for campaign performance data (if not already existing).
*   `src/services/analytics/dashboardService.js`: Extend existing service to include MarketingOS campaign data retrieval.
*   `src/ui/components/dashboards/MarketingAnalyticsPanel.jsx`: Update React/Vue component to display new metrics.
*   `src/config/env.js`: Add any necessary environment variables for MarketingOS API keys or endpoint configurations.

## 4. Verifier/Runtime Checks

*   **API Endpoint Test:** Use Postman/cURL or an automated test to send a sample `CampaignPerformanceEvent` payload to the new `/api/marketingos/campaign-performance` endpoint. Verify a `200 OK` response and correct data parsing in logs.
*   **Database Inspection:** Directly query the LifeOS analytics database (e.g., MongoDB, PostgreSQL) to confirm that the `CampaignPerformanceEvent` data is correctly stored, including all expected fields and values.
*   **UI Verification:** Navigate to the LifeOS analytics dashboard. Confirm that the new MarketingOS campaign metrics are displayed accurately, update as expected after new data ingestion, and do not introduce any UI regressions or errors.
*   **Log Monitoring:** Monitor LifeOS application logs for `src/services/marketingos/campaignPerformanceIngestionService.js` for any errors, warnings, or unexpected behavior during data processing.
*   **Performance Check:** Observe dashboard load times and responsiveness after the integration to ensure no performance degradation.

## 5. Stop Conditions if Runtime Truth Disagrees

*   The new API endpoint returns any status code other than `200 OK` for valid payloads, or returns `200 OK` but fails to process data.
*   Database inspection reveals missing, malformed, or incorrect `CampaignPerformance` data after successful API ingestion.
*   The LifeOS analytics dashboard component fails to render, displays incorrect or stale data, or throws client-side errors when attempting to show MarketingOS metrics.
*   Critical errors or repeated warnings are observed in the `campaignPerformanceIngestionService` logs.
*   Significant performance degradation (e.g., >10% increase in load time) is observed in the LifeOS analytics dashboard.
*   Security vulnerabilities (e.g., unauthenticated access, data leakage) are identified during testing.