# AMENDMENT_41_MARKETINGOS Proof - G459-100: SSOT Foundation for User Marketing Opt-In Status

This document outlines the proof-closing blueprint note for establishing LifeOS as the Single Source of Truth (SSOT) for `user.preferences.marketingOptInStatus` as required by AMENDMENT_41_MARKETINGOS.

---

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a verified, production-ready data flow and corresponding MarketingOS consumption mechanism that guarantees `user.preferences.marketingOptInStatus` in MarketingOS accurately reflects the value managed by LifeOS. Specifically, there is no explicit, tested integration point and a proof of its end-to-end consistency.

### 2. Smallest Safe Build Slice to Close It

Implement a dedicated, read-only LifeOS API endpoint to expose `user.preferences.marketingOptInStatus` for a given user ID. Develop a minimal MarketingOS service/component that consumes this new LifeOS API endpoint and displays the fetched status. This slice focuses purely on establishing and proving the SSOT data flow for this specific preference, without modifying existing user-facing features or complex MarketingOS logic.

### 3. Exact Safe-Scope Files to Touch First

*   `services/user-profile/src/api/userPreferencesRouter.js`: Extend to add a new GET route, e.g., `/api/v1/user-preferences/:userId/marketing-opt-in-status`.
*   `services/user-profile/src/data/userPreferenceService.js`: Add a new function, e.g., `getMarketingOptInStatus(userId)`, to retrieve the specific preference from the database.
*   `services/marketingos-integration/src/clients/lifeosUserProfileClient.js`: Add a new method, e.g., `fetchUserMarketingOptInStatus(userId)`, to call the new LifeOS API endpoint.
*   `services/marketingos-integration/src/components/MarketingOptInStatusDisplay.js`: (New file, if not existing) A simple internal component to demonstrate fetching and displaying the status, for internal proofing.

### 4. Verifier/Runtime Checks

*   **LifeOS API Endpoint Verification:**
    *   **Test 1:** Call the new LifeOS API endpoint with a known `userId` where `marketingOptInStatus` is `true`. Verify the API response returns `{"marketingOptInStatus": true}`.
    *   **Test 2:** Call the new LifeOS API endpoint with a known `userId` where `marketingOptInStatus` is `false`. Verify the API response returns `{"marketingOptInStatus": false}`.
    *   **Test 3:** Call the new LifeOS API endpoint with a `userId` that does not exist. Verify the API returns an appropriate 404 or error response.
*   **MarketingOS Consumption Verification:**
    *   **Test 1:** Deploy the `MarketingOptInStatusDisplay` component (or equivalent internal tool). For a user with `marketingOptInStatus: true` in LifeOS, verify the component displays "Opted In".
    *   **Test 2:** For a user with `marketingOptInStatus: false` in LifeOS, verify the component displays "Opted Out".
*   **SSOT Consistency Verification (Manual/Observational):**
    *   **Test 1:** Using an internal LifeOS admin tool, change a user's `marketingOptInStatus` from `true` to `false`. Observe the `MarketingOptInStatusDisplay` component in MarketingOS for that user. Verify the status updates from "Opted In" to "Opted Out" within 5 minutes.
    *   **Test 2:** Repeat Test 1, changing from `false` to `true`. Verify the status updates from "Opted Out" to "Opted In" within 5 minutes.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If the LifeOS API endpoint consistently returns incorrect `marketingOptInStatus` values compared to the database.
*   If the MarketingOS client fails to connect to the LifeOS API or consistently receives malformed responses.
*   If the `MarketingOptInStatusDisplay` component (or equivalent) in MarketingOS displays stale or incorrect data, indicating a failure in the data flow or consumption logic.
*   If changes made to `marketingOptInStatus` in LifeOS are