# Proof-Closing Blueprint Note: Amendment 41 MarketingOS Proof G109-100 (SSOT Foundation)

This document outlines the necessary steps to close the proof gap for MarketingOS's adherence to the Single Source of Truth (SSOT) principle for `UserSegment_G109`, as defined by Amendment 41.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a verifiable, real-time mechanism and corresponding proof that MarketingOS consistently consumes and reflects the `UserSegment_G109` attribute *exclusively* from LifeOS's `UserPreferencesService` as its SSOT, without independent modification or significant data staleness. Specifically, the proof point G109-100 requires demonstrating that MarketingOS's internal state for this segment directly mirrors LifeOS's authoritative record.

## 2. Smallest Safe Build Slice to Close It

Implement a dedicated, internal-only API endpoint within MarketingOS that exposes the current `UserSegment_G109` status for a given `userId` as MarketingOS understands it. This endpoint will internally query LifeOS's `UserPreferencesService` for the authoritative `UserSegment_G109` status and compare it against MarketingOS's locally cached or derived state for the same user. The endpoint's response will include both the LifeOS SSOT value and MarketingOS's current value, along with a timestamp of MarketingOS's last sync/update for that user's segment. This allows for direct, programmatic verification of SSOT adherence.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/src/api/internal/userSegments.js`: Create a new internal API route `/internal/user-segments/:userId/g109` to expose the segment status. This file will contain the endpoint logic.
*   `services/marketingos/src/lib/lifeosClient.js`: Extend or create a client module to interact with LifeOS's `UserPreferencesService` to fetch the authoritative `UserSegment_G109` status.
*   `services/marketingos/src/services/segmentSyncService.js`: (If existing) Ensure the background sync process for `UserSegment_G109` is robust and logs its sync times. (If not existing) A minimal background sync mechanism might be needed to keep MarketingOS's internal state reasonably fresh, though the proof focuses on *verification* against SSOT.
*   `services/lifeos/src/services/userPreferencesService.js`: Verify that `getUserSegmentG109(userId)` is an existing, performant, and correctly permissioned method. If not, expose it.

## 4. Verifier/Runtime Checks

*   **Automated E2E Test (LifeOS -> MarketingOS Sync):**
    1.  Create a new user in LifeOS via `UserManagementService` with `UserSegment_G109` set to `true`.
    2.  Call MarketingOS's new internal endpoint `/internal/user-segments/:userId/g109`.
    3.  Assert that the response indicates `lifeos_ssot_g109: true` and `marketingos_current_g109: true` within the defined sync latency (e.g., 5 minutes).
    4.  Update the user's `UserSegment_G109` to `false` in LifeOS.
    5.  Repeat step 2 and 3, asserting `false` for both values within the sync latency.
*   **Automated Unit/Integration Test (MarketingOS Internal Logic):**
    1.  Mock `lifeosClient.getUserSegmentG109` to return various states (`true`, `false`, `null`).
    2.  Test the new internal endpoint's logic to ensure it correctly fetches, compares, and reports the SSOT and MarketingOS values.
*   **Monitoring:** Implement metrics for the latency of `UserSegment_G109` updates from LifeOS to MarketingOS, and for discrepancies reported by the internal endpoint.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Persistent Discrepancy:** If the `marketingos_current_g109` value consistently (e.g., for > 15 minutes across multiple users) fails to match `lifeos_ssot_g109` when queried via the internal endpoint, indicating a fundamental sync or data processing failure.
*   **Excess