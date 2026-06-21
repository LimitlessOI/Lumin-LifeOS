<!-- SYNOPSIS: Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Proof G913-100 -->

# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Proof G913-100

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** SSOT foundation for Amendment 41.

---

### 1. Exact Missing Implementation or Proof Gap

The core gap is the verifiable end-to-end delivery and display of the `MarketingOS_Campaign_ID` within the LifeOS user profile context, specifically ensuring it's accessible for internal analytics and potentially rendered in a debug/admin view. The current state lacks a concrete runtime assertion that this specific ID, as defined by Amendment 41, is correctly propagated and stored/displayed post-ingestion from MarketingOS.

### 2. Smallest Safe Build Slice to Close It

Implement a minimal read-path verification endpoint or an internal debug UI component that queries the user's associated `MarketingOS_Campaign_ID` and displays it. This slice focuses purely on read-back and verification, not on initial ingestion or complex business logic.

### 3. Exact Safe-Scope Files to Touch First

*   `src/api/internal/debug/marketingos.js`: New internal API route to fetch `MarketingOS_Campaign_ID` for a given user.
*   `src/services/marketingosService.js`: Add a method to retrieve the `MarketingOS_Campaign_ID` from the user's data store. (Assuming such a service exists or needs a new method).
*   `src/data/userRepository.js`: Ensure the `MarketingOS_Campaign_ID` field is queryable. (Assuming it's already stored, just needs a getter).
*   `src/tests/api/internal/debug/marketingos.test.js`: Unit/integration tests for the new debug endpoint.

### 4. Verifier/Runtime Checks

*   **API Check:** Call `GET /api/internal/debug/marketingos/:userId` with a known user ID that has an associated `MarketingOS_Campaign_ID`.
    *   **Expected Outcome:** HTTP 200 OK, response body contains `{ userId: "...", marketingOsCampaignId: "G913-100-EXAMPLE" }`.
*   **Data Store Check:** Directly query the user data store for a specific user and verify the `marketingOsCampaignId` field matches the expected value.
*   **Log Check:** Monitor internal logs for successful data retrieval and absence of errors related to `MarketingOS_Campaign_ID` access.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **API Returns 404/500:** The debug endpoint is not found or throws a server error, indicating a routing or service layer issue.
*   **API Returns Incorrect ID:** The `marketingOsCampaignId` in the API response does not match the expected value for the test user, indicating a data retrieval or storage issue.
*   **API Returns Null/Undefined ID:** The `marketingOsCampaignId` is consistently missing for users expected to have it, suggesting an upstream ingestion or storage failure.
*   **Data Store Query Fails:** Direct database query for `marketingOsCampaignId` returns no data or an error, indicating a fundamental data persistence problem.
*   **Security/Authz Failure:** The internal debug endpoint is accessible without proper internal authentication/authorization, indicating a security regression.
---