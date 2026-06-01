# Amendment 41: MarketingOS Proof - G11-100

## 1. Exact Missing Implementation or Proof Gap

The core proof gap for G11-100 is the programmatic transmission of the `user_engagement_score` from LifeOS to MarketingOS via the specified API endpoint. As defined in `AMENDMENT_41_MARKETINGOS.md`, the `POST /api/v1/marketingos/user-engagement` endpoint is not yet invoked with the required `userId` and `engagementScore` payload upon a user's engagement score update within LifeOS. This constitutes the final integration point for G11-100 data flow.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Creating a new `MarketingOSIntegrationService` responsible for encapsulating the HTTP client and making calls to the MarketingOS API.
2.  Modifying the existing `UserService` (or the service responsible for calculating/updating `user_engagement_score`) to trigger a call to this new `MarketingOSIntegrationService` whenever a user's engagement score is updated or recalculated.
3.  Ensuring the payload (`userId`, `engagementScore`) is correctly formatted and transmitted.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/UserService.js`: Introduce a call to `MarketingOSIntegrationService.sendUserEngagementScore(userId, score)` within the `updateUserEngagementScore` method (or equivalent).
*   `src/services/MarketingOSIntegrationService.js`: (New file) Implement a class with a `sendUserEngagementScore` method that uses an HTTP client to `POST` data to the MarketingOS endpoint.
*   `src/config/marketingos.js`: (New file, if not existing) Define `MARKETINGOS_API_URL` and any necessary API keys or authentication headers.
*   `src/utils/apiClient.js`: (Existing file) Ensure a generic HTTP client utility is available and properly configured for external API calls, or extend it to include MarketingOS-specific headers if needed.

## 4. Verifier/Runtime Checks

*   **LifeOS Logs:** Monitor LifeOS service logs for successful HTTP 200/202 responses from the MarketingOS API following `user_engagement_score` updates. Log any non-2xx responses with full error details.
*   **MarketingOS Platform:** Verify that the `user_engagement_score` for a set of test users appears correctly and with expected values within the MarketingOS platform's user profiles or analytics dashboards.
*   **Data Consistency:** Cross-reference `user_engagement_score` values in LifeOS with those observed in MarketingOS for a sample set of users to ensure data consistency and correct mapping.
*   **Performance Monitoring:** Observe LifeOS service performance metrics (latency, CPU, memory) to ensure the new integration does not introduce regressions.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **API Errors:** Consistent non-2xx responses from the MarketingOS API (e.g., 4xx client errors, 5xx server errors) indicating integration failure or misconfiguration.
*   **Data Mismatch:** The `user_engagement_score` in MarketingOS does not match the expected value from LifeOS for test users, or the data is malformed/missing.
*   **Performance Degradation:** The integration causes a measurable and sustained increase in latency, error rates, or resource utilization in LifeOS services beyond acceptable thresholds.
*   **Schema Validation:** MarketingOS platform reports schema validation errors for the received `user_engagement_score` payload, indicating incorrect data formatting from LifeOS.
*   **Irreversible Data Corruption:** Any indication that the integration is causing incorrect or corrupted data to be stored in either LifeOS or MarketingOS.