# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G141-100

This document serves as a proof-closing blueprint note for `AMENDMENT_41_MARKETINGOS.md`, establishing the SSOT foundation for `user.marketingOptInStatus` synchronization.

## 1. Exact Missing Implementation or Proof Gap

The current system lacks a verifiable mechanism to confirm that the `user.marketingOptInStatus` attribute is correctly synchronized from LifeOS to MarketingOS, and that status change events are reliably emitted and captured. Specifically, there is no dedicated internal endpoint or logging mechanism to query the *current* synchronized status or to confirm the *receipt* of status change events by an internal MarketingOS-facing service. The gap is the absence of a direct, auditable proof point for the data flow and event integrity as defined by Amendment 41.

## 2. Smallest Safe Build Slice to Close It

Implement a new, internal-only `/debug/marketing-opt-in-status/:userId` endpoint within a LifeOS internal service (e.g., `lifeos-data-sync-service`). This endpoint will query the current `user.marketingOptInStatus` from the LifeOS user profile and report its last known synchronized state or pending synchronization status. Additionally, enhance existing `user.marketingOptInStatus` event emission logic to include a unique `correlationId` for each event, and log this `correlationId` upon successful emission from LifeOS. This slice focuses on internal observability without altering user-facing features.

## 3. Exact Safe-Scope Files to Touch First

*   `src/internal-api/routes/debug.js`: Add a new route definition for `/debug/marketing-opt-in-status/:userId`.
*   `src/internal-api/controllers/debugController.js`: Implement the controller logic for the new debug endpoint, fetching `user.marketingOptInStatus`.
*   `src/services/userService.js`: Expose a method to retrieve `user.marketingOptInStatus` for a given user ID, ensuring it's accessible by the internal debug controller.
*   `src/events/userEvents.js`: Modify the `marketingOptInStatus` change event emission to include a generated `correlationId` and ensure it's logged.
*   `src/utils/logger.js`: Ensure the logger can capture the `correlationId` for event emissions.

## 4. Verifier/Runtime Checks

1.  **API Check:**
    *   **Action:** Make a `GET` request to `/debug/marketing-opt