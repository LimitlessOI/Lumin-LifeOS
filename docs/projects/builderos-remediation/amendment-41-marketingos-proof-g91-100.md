<!-- SYNOPSIS: AMENDMENT_41_MARKETINGOS: Proof-Closing Blueprint Note (G91-100) -->

# AMENDMENT_41_MARKETINGOS: Proof-Closing Blueprint Note (G91-100)

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

This blueprint note outlines the plan for closing the proof gap for MarketingOS integration items G91-100, focusing on the final stages of data synchronization and verification.

---

### 1. Exact Missing Implementation or Proof Gap

The primary gap for G91-100 is the complete implementation and verified end-to-end synchronization of `UserEngagementMetrics` and `CampaignAttribution` data points from LifeOS `AnalyticsService` to the MarketingOS `CustomerDataPlatform` (CDP). This includes ensuring data integrity, correct schema mapping, and real-time availability for MarketingOS segmentation and reporting.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Implementing the data transformation and ingestion pipeline for `UserEngagementMetrics` (G91-G95) from LifeOS `AnalyticsService` to MarketingOS `CustomerDataPlatform`.
*   Establishing robust error handling and logging for this specific data flow.
*   Developing targeted integration tests to validate the data transfer and transformation for a representative sample of user engagement events.

### 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/dataSyncService.js`: Extend existing `syncAnalyticsData` function to include `UserEngagementMetrics` processing.
*   `models/marketingos/UserEngagementMetric.js`: Define or update the data model for `UserEngagementMetrics` as expected by MarketingOS CDP.
*   `integrations/marketingos/cdpClient.js`: Add or update methods for ingesting `UserEngagementMetrics` into the MarketingOS CDP API.
*   `config/featureFlags.js`: Introduce a feature flag (e.g., `marketingosUserEngagementSyncEnabled`) to control the rollout.
*   `tests/integrations/marketingos/userEngagementSync.test.js`: Create a new test suite for end-to-end verification of `UserEngagementMetrics` sync.
*   `