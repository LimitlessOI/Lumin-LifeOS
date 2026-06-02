# AMENDMENT_41_MARKETINGOS: Proof G147-100 - User Consent SSOT Verification

This document serves as a proof-closing blueprint note for the MarketingOS integration, specifically addressing the Single Source of Truth (SSOT) for user marketing consent preferences.

## 1. Exact Missing Implementation or Proof Gap

The current integration between LifeOS and MarketingOS lacks a robust, verifiable mechanism to confirm the real-time synchronization and SSOT status of user marketing consent preferences (e.g., `emailOptInStatus`). While data might flow, there is no explicit, dedicated proof-of-sync endpoint or logging that confirms MarketingOS accurately reflects LifeOS's canonical consent state for a given user, establishing LifeOS as the SSOT for this attribute. The gap is the absence of a direct, auditable endpoint to query LifeOS's definitive `emailOptInStatus` for a user, which can then be cross-referenced externally.

## 2. Smallest Safe Build Slice to Close It

Implement a new internal, read-only `/api/v1/marketingos/proof/user-consent-status/:userId` endpoint within LifeOS. This endpoint will query the canonical `emailOptInStatus` directly from the LifeOS user data store. It will return the current consent status and a timestamp of its last known update within LifeOS. This endpoint is strictly for internal verification and proofing, not for general MarketingOS consumption.

## 3. Exact Safe-Scope Files to Touch First

*   `src/api/routes/marketingos.js`: Add a new GET route for `/proof/user-consent-status/:userId`.
*   `src/services/userService.js`: Add a new method, `getUserConsentStatus(userId)`, to retrieve the `emailOptInStatus` and its `updatedAt` timestamp from the user model.
*   `src/models/user.js`: Ensure the `emailOptInStatus` field is correctly defined and indexed for efficient lookup.
*   `src/tests/api/marketingos.test.js`: Add unit and integration tests for the new proof endpoint to ensure correct data retrieval and response format.

## 4. Verifier/Runtime Checks

To verify the proof gap is closed:

*   **API Call:** Execute `GET /api/v1/marketingos/proof/user-consent-status/:userId` for a known `userId`.
    *   **Expected Response:** A JSON object similar to `{ "userId": "...", "emailOptInStatus": true/false, "lastUpdated": "ISO_TIMESTAMP" }`.
    *   **Verification:**
        *   Confirm the HTTP status code is 200 OK.
        *   Verify `emailOptInStatus` in the response matches the known, canonical state in the LifeOS database for the given `userId`.
        *   Verify `lastUpdated` is a valid ISO timestamp and reflects the last update time of the consent status in LifeOS.
*   **Database Query:** Directly query the LifeOS `users` collection/table for the `userId` and confirm the `emailOptInStatus` and `updatedAt` fields match the API response.
*   **Log Check:** Monitor LifeOS application logs for successful processing of the proof endpoint request, ensuring no errors or unexpected warnings are generated.

## 5. Stop Conditions if Runtime Truth Disagrees

The proof is considered failed, and further action is required, if any of the following conditions are met:

*   The `/api/v1/marketingos/proof/user-consent-status/:userId` endpoint returns a 4xx or 5xx HTTP error code.
*   The `emailOptInStatus` returned by the API does not match the canonical value stored in the LifeOS database for the same `userId`.
*   The `lastUpdated` timestamp is missing, malformed