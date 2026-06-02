# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - G891-100

This document serves as a proof-closing blueprint note for Amendment 41, focusing on the verification of MarketingOS integration.

## 1. Exact Missing Implementation or Proof Gap

The exact missing proof gap is the runtime verification that `UserConsentPreference` updates for the `email_marketing` channel, originating from LifeOS, are accurately and consistently propagated to and reflected within MarketingOS. While the propagation mechanism may exist, a dedicated, automated verification step is absent.

## 2. Smallest Safe Build Slice to Close It

Implement a lightweight, asynchronous verification routine that, upon a successful `UserConsentPreference` update for `email_marketing` in LifeOS, attempts to query MarketingOS for the corresponding user's consent state. This routine will log the comparison result (match/mismatch/error) without blocking the primary user preference update flow. This slice focuses solely on read-back verification, not modifying the propagation itself.

## 3. Exact Safe-Scope Files to Touch First

*   `integrations/marketingOSClient.js`:
    *   Add a new asynchronous function `verifyUserConsentState(userId, channel, expectedState)` that queries MarketingOS API for the user's consent state for the specified channel and compares it against `expectedState`.
    *   This function should return a structured result (e.g., `{ status: 'MATCH' | 'MISMATCH' | 'ERROR', details: string }`).
*   `services/userPreferenceService.js`:
    *   Within the `updateUserConsentPreference` function, after a successful update and *after* the existing propagation call to MarketingOS (if any), add an asynchronous call to `marketingOSClient.verifyUserConsentState`.
    *   Log the result of this verification using the existing logging utility.
*   `utils/logger.js`: (Verification) Ensure a specific log level and tag are available for `[MarketingOS_VERIFY]` messages.

## 4. Verifier/Runtime Checks

*   **LifeOS Logs:** Monitor `[MarketingOS_VERIFY]` log entries for `status: 'MATCH'`. Any `status: 'MISMATCH'` or `status: 'ERROR'` indicates a failure.
*   **MarketingOS API (Direct):** For specific test users, directly query the MarketingOS user consent API endpoint (e.g., `/api/v1/users/{userId}/consent`) to confirm the `email_marketing` status matches the LifeOS source of truth.
*   **MarketingOS UI (Manual):** For critical test cases, manually inspect the user profile within the MarketingOS administrative interface to visually confirm the `email_marketing` consent status.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Log Mismatch Rate:** If more than 0.1% of `[MarketingOS_VERIFY]` log entries report `status: 'MISMATCH'` or `status: 'ERROR'` over a 24-hour period.
*   **API Discrepancy:** If direct MarketingOS API queries for test users consistently show a discrepancy in `email_marketing` consent state compared to LifeOS.
*   **Performance Impact:** If the addition of the verification routine introduces a measurable latency increase (e.g., >20