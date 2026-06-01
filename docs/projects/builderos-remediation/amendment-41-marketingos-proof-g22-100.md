# Amendment 41 MarketingOS Proof: G22-100 - Premium Subscriber SSOT Sync

This document serves as a proof-closing blueprint note for gap `G22-100`, focusing on the implementation of the Single Source of Truth (SSOT) for LifeOS Premium Subscriber profile data within MarketingOS, as outlined conceptually in `docs/projects/AMENDMENT_41_MARKETINGOS.md`.

---

## 1. Exact Missing Implementation or Proof Gap

The blueprint `AMENDMENT_41_MARKETINGOS.md` establishes the conceptual framework for LifeOS user profile data synchronization to MarketingOS as the SSOT. The specific gap `G22-100` is the absence of a concrete implementation plan and proof for the initial bulk synchronization and subsequent delta updates of `Premium Subscriber` user profiles from the LifeOS `User` service to the MarketingOS `Contact` entity. This includes defining the precise data mapping, sync triggers, idempotency handling, and error recovery mechanisms for this specific user segment to ensure data consistency and reliability.

## 2. Smallest Safe Build Slice to Close It

Implement a new `MarketingOSSyncService` within the LifeOS `User` domain. This service will be responsible for orchestrating the data flow. The slice focuses solely on:
    a.  **Data Extraction:** Retrieving `Premium Subscriber` profiles from the LifeOS `UserRepository`.
    b.  **Data Transformation:** Mapping LifeOS user data to the MarketingOS `Contact` entity schema.
    c.  **Secure API Interaction:** Utilizing a new `MarketingOSApiClient` to send transformed data to MarketingOS.
This build slice will not alter existing LifeOS user-facing features or MarketingOS campaign logic. It will leverage existing LifeOS `User` repository methods and introduce new, isolated components for MarketingOS integration.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/MarketingOSSyncService.ts` (New file: Orchestrates sync logic)
*   `src/clients/MarketingOSApiClient.ts` (New file: Handles secure HTTP requests to MarketingOS API)
*   `src/repositories/UserRepository.ts` (Extend: Add `getPremiumSubscribers()` method)
*   `src/types/marketingos.d.ts` (New file: Defines MarketingOS API request/response types)
*   `src/config/featureFlags.ts` (Extend: Add `MARKETINGOS_PREMIUM_SYNC_ENABLED` flag)
*   `src/events/UserEvents.ts` (Extend: Add `USER_PREMIUM_STATUS_UPDATED` event for delta sync triggers)
*   `src/jobs/MarketingOSBulkSyncJob.ts` (New file: Scheduled job for initial/periodic bulk sync)

## 4. Verifier/Runtime Checks

*   **Unit Tests:** Comprehensive coverage for `MarketingOSSyncService` methods, data transformation logic, and `MarketingOSApiClient` request/response handling.
*   **Integration Tests:** Verify `MarketingOSSyncService` correctly transforms and sends data to a mock MarketingOS endpoint, asserting payload structure and idempotency.
*   **E2E Test (Staging Environment):**
    *   Create a new user, upgrade to premium, and verify their profile appears correctly in MarketingOS staging within 5 minutes.
    *   Update an existing premium user's profile (e.g., email, name) in LifeOS staging and verify the update propagates to MarketingOS staging within 2 minutes.
    *   Run the `MarketingOSBulkSyncJob