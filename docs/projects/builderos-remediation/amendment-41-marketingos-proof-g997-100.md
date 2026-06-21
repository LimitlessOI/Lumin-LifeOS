<!-- SYNOPSIS: Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Gap G997-100 -->

# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Gap G997-100

This document serves as a proof-closing blueprint note for the identified gap G997-100 within Amendment 41, pertaining to the MarketingOS integration. The objective is to provide an implementation-first plan to close the specified proof gap, ensuring readiness for the next C2 build pass.

---

1.  **Exact Missing Implementation or Proof Gap:**
    The core implementation for synchronizing `UserConsent` status changes from LifeOS to MarketingOS is missing. Specifically, the `MarketingOSAdapter` lacks the concrete method to translate LifeOS consent events into MarketingOS API calls and execute them reliably. This gap prevents the "Single Source of Truth" (SSOT) for user consent from propagating effectively to MarketingOS, as outlined in Amendment 41.

2.  **Smallest Safe Build Slice to Close It:**
    Implement the `syncUserConsentStatus(userId, consentStatus)` method within the `MarketingOSAdapter`. This method will encapsulate the logic for:
    *   Receiving `userId` and the new `consentStatus`.
    *   Constructing the appropriate payload for the MarketingOS API.
    *   Making an authenticated API call to MarketingOS to update the user's consent record.
    *   Handling API responses, including success and error conditions.
    *   Logging relevant events for traceability.
    This slice focuses solely on the adapter's responsibility for external communication, without altering core LifeOS user features or TSOS surfaces.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `src/adapters/MarketingOSAdapter.js`: Add the `syncUserConsentStatus` method.
    *   `src/services/UserService.js`: Modify the `updateUserConsent` method to asynchronously call `MarketingOSAdapter.syncUserConsentStatus` after successfully updating LifeOS's internal consent state.
    *   `src/config/marketingos.js`: Ensure MarketingOS API endpoint and authentication details are correctly configured and accessible by the adapter. (If not present, create with minimal necessary config).
    *   `src/tests/adapters/MarketingOSAdapter.test.js`: Add unit tests for the new `syncUserConsentStatus` method, mocking external API calls.
    *   `src/tests/services/UserService.test.js`: Add integration-style tests to verify `updateUserConsent` correctly invokes the `MarketingOSAdapter`.

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests:** `npm test src/adapters/MarketingOSAdapter.test.js` should pass, verifying correct payload construction, API call invocation (mocked), and error handling.
    *   **Integration Tests:** `npm test src/services/UserService.test.js` should pass, confirming that `UserService.updateUserConsent` triggers the `MarketingOSAdapter` call.
    *   **Manual Verification (Dev/Staging):**
        1.  Change a user's consent status in the LifeOS admin panel or via a test API endpoint.
        2.  Observe LifeOS application logs for successful invocation and response from `MarketingOSAdapter`.
        3.  Verify directly in the MarketingOS platform (UI or API) that the user's consent status has been updated correctly and reflects the change made in LifeOS.
        4.  Test edge cases: network errors, MarketingOS API rate limits, invalid consent values.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   **Consistent API Errors:** If `MarketingOSAdapter` consistently receives non-2xx responses (e.g., 400, 401, 403, 500) from MarketingOS, indicating a fundamental issue with authentication, authorization, data schema, or service availability.
    *   **Data Discrepancy:** If the consent status in MarketingOS does not consistently match the LifeOS source of truth after multiple successful `syncUserConsentStatus` calls.
    *   **Performance Impact:** If the synchronization process introduces noticeable latency or resource contention within LifeOS or MarketingOS, impacting user experience or system stability.
    *   **Security Audit Flag:** If a security review identifies vulnerabilities in the data transmission or storage related to this integration.
    *   **Unforeseen Side Effects:** Any observed regressions or unexpected behavior in other LifeOS features or TSOS customer-facing surfaces after deployment of this slice.