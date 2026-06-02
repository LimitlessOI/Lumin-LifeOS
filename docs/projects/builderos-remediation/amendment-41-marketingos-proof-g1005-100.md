Proof-Closing Blueprint Note: MarketingOS Proof G1005-100
1. Exact Missing Implementation or Proof Gap:
The current system lacks a verified mechanism to ensure that updates to a user's `profile_status` within LifeOS are reliably and promptly synchronized to MarketingOS's user segmentation data store. Specifically, proof point G1005-100 requires demonstrating that a `profile_status` change from 'pending' to 'active' in LifeOS triggers a corresponding update in MarketingOS, allowing for accurate user segmentation and campaign targeting based on the most current user status.
2. Smallest Safe Build Slice to Close It:
Implement an event listener in the LifeOS `UserService` (or similar user profile management service) that publishes a `UserStatusUpdated` event upon `profile_status` change. Create a new handler in the MarketingOS integration layer that subscribes to this event, transforms the relevant user data (e.g., `userId`, `newStatus`), and calls the MarketingOS API to update the user's profile attributes or segmentation tags. This ensures a reactive, decoupled synchronization.
3. Exact Safe-Scope Files to Touch First:
-   `services/user/UserService.js`: Add event emission logic after `profile_status` update.
-   `events/UserEvents.js`: Define `UserStatusUpdated` event schema (if not already present).
-   `integrations/marketingos/MarketingOSIntegrationService.js`: Add event subscription and handler logic for `UserStatusUpdated`.
-   `integrations/marketingos/MarketingOSApiClient.js`: Add a method to update user attributes or tags in MarketingOS (e.g., `updateUserStatus(userId, status)`).
-   `tests/integrations/marketingos/MarketingOSIntegrationService.test.js`: Add unit/integration tests for the new event handler.
4. Verifier/Runtime Checks:
-   Unit Tests: Verify `UserService` emits `UserStatusUpdated` event with correct payload (`userId`, `oldStatus`, `newStatus`). Verify `MarketingOSIntegrationService` handler correctly processes the event and calls `MarketingOSApiClient` with the transformed data.
-   Integration Tests: Simulate a `profile_status` update in LifeOS (e.g., via a mock `UserService` call), assert that the `MarketingOSApiClient` method is invoked with the expected user ID and status.
-   End-to-End Test (Staging): Update a test user's `profile_status` in LifeOS via the standard user flow. Query MarketingOS directly (via its API or UI) to confirm the user's segmentation data reflects the change (e.g., 'active' tag) within acceptable latency (e.g., < 60 seconds).
-   Monitoring: Observe event bus metrics for `UserStatusUpdated` events and MarketingOS API call success rates and latencies.
5. Stop Conditions if Runtime Truth Disagrees:
-   If `UserStatusUpdated` events are not emitted or contain incorrect data from `UserService` upon `profile_status` change.
-   If `MarketingOSIntegrationService` fails to subscribe or process `UserStatusUpdated` events, leading to missed updates.
-   If `MarketingOSApiClient` calls fail or return unexpected errors when attempting to update MarketingOS.
-   If MarketingOS segmentation data does not consistently reflect LifeOS `profile_status` changes within the defined latency in staging/production environments.
-   If the integration introduces noticeable latency or resource contention in either LifeOS (event emission) or MarketingOS (API processing).