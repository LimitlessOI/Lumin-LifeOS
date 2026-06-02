### Proof-Closing Blueprint Note: Amendment 41 MarketingOS SSOT Foundation (g147-100)

This document addresses the proof gap for the Single Source of Truth (SSOT) foundation established by Amendment 41 for MarketingOS integration.

1.  **Exact missing implementation or proof gap:**
    The core gap is the absence of a fully implemented and verified data synchronization mechanism that establishes and maintains LifeOS's `User.marketingPreferences` as the SSOT, as defined in `AMENDMENT_41_MARKETINGOS.md`. Specifically, the initial population and ongoing reconciliation of user marketing preferences from the designated MarketingOS source into LifeOS's `User` model. Proof point g147-100 requires demonstrating that the `marketingPreferences` field accurately reflects the SSOT.

2.  **Smallest safe build slice to close it:**
    Implement a dedicated `MarketingPreferenceSyncService` responsible for fetching marketing preference data from the MarketingOS API (or designated staging area) and applying updates to the `User` model. This service will expose a `syncUserPreferences(userId)` method and a `syncAllUsersPreferences()` method. A scheduled job will invoke `syncAllUsersPreferences()` periodically. An initial data migration script will perform the first full sync for existing users.

3.  **Exact safe-scope files to touch first:**
    *   `src/services/MarketingPreferenceSyncService.js` (new file)
    *   `src/jobs/syncMarketingPreferencesJob.js` (new file)
    *   `src/models/User.js` (ensure `marketingPreferences` schema is aligned with Amendment 41)
    *   `src/migrations/00x-initial-marketing-prefs-sync.js` (new file, for initial data population)
    *   `src/config/marketingos.js` (new file, for MarketingOS API endpoints/credentials)
    *   `src/utils/marketingosApiClient.js` (new file, for API interaction)

4.  **Verifier/runtime checks:**
    *   **Unit Tests:** `MarketingPreferenceSyncService.js` for data transformation, error handling, and partial updates.
    *   **Integration Tests:** Verify `syncMarketingPreferencesJob` successfully processes a batch of users and updates their `marketingPreferences` in the database.
    *   **E2E Test (Manual/Automated):** Select a sample of 100 users. Manually verify their `marketingPreferences` in LifeOS against the MarketingOS SSOT after the initial migration and after at least two scheduled sync job runs.
    *   **Runtime Monitoring:** Monitor `syncMarketingPreferencesJob` execution logs for success/failure rates, processing duration, and number of users updated. Implement metrics for `marketingPreferences` data consistency (e.g., count of users where LifeOS preferences diverge from SSOT).

5.  **Stop conditions if runtime truth disagrees:**
    *   If the E2E test reveals a discrepancy rate greater than 0.5% between LifeOS `marketingPreferences` and the MarketingOS SSOT for the sample users.
    *   If `syncMarketingPreferencesJob` fails to complete successfully for 3 consecutive runs.
    *   If the average execution time of `syncMarketingPreferencesJob` exceeds 5 minutes for a full sync of 100,000 users.
    *   If database write contention or performance degradation is observed on the `User` collection during sync operations, impacting other critical services.