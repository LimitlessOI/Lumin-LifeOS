<!-- SYNOPSIS: Amendment 41 MarketingOS Proof: G197-100 - User Activity Timestamp Verification -->

# Amendment 41 MarketingOS Proof: G197-100 - User Activity Timestamp Verification

This blueprint note addresses the proof gap for verifying the correct propagation and accessibility of user activity timestamps for MarketingOS integration, as outlined in Amendment 41.

---

### 1. Exact missing implementation or proof gap

The system currently lacks a verifiable mechanism to confirm that a user's `last_activity_at` timestamp, updated within LifeOS, is correctly propagated and accessible for MarketingOS integration. Specifically, the proof gap is the absence of an internal, read-only endpoint or log entry that confirms the *readiness* of this updated timestamp for MarketingOS consumption, adhering to the data contract defined in Amendment 41. This gap prevents direct, automated verification of the data pipeline's integrity for this critical marketing data point.

### 2. Smallest safe build slice to close it

Implement a new internal, read-only API endpoint: `/api/v1/marketingos/user-activity-proof/:userId`. This endpoint will:
*   Accept a `userId` as a path parameter.
*   Query the LifeOS user activity store (e.g., `UserActivity` model) to retrieve the `last_activity_at` timestamp for the specified user.
*   Return a JSON object containing the `userId` and the `last_activity_at` timestamp, formatted as an ISO 8601 string, consistent with MarketingOS data expectations.
*   This endpoint will *not* trigger any MarketingOS actions or modify any user data. Its sole purpose is to provide a verifiable proof point for the data's current state within LifeOS, ready for potential MarketingOS consumption.

### 3. Exact safe-scope files to touch first

*   `src/api/routes/marketingos.js` (Create if not exists, or extend existing MarketingOS API routes)
*   `src/services/userService.js` (Add a new method, e.g., `getUserLastActivityTimestamp(userId)`, to abstract data retrieval)
*   `src/models/userActivity.js` (Ensure the `last_activity_at` field is correctly defined and indexed for efficient lookup)
*   `src/api/controllers/marketingosController.js` (Create a new controller function, e.g., `getUserActivityProof`, to handle the endpoint logic)

### 4. Verifier/runtime checks

1.  **Pre-condition:** A test user `U_TEST` performs an activity within LifeOS (e.g., logs in, views a page, completes an action) that is known to update their `last_activity_at` timestamp in the LifeOS database. Record the exact timestamp of this activity.
2.  **Check 1 (API Call):** Execute a `GET` request to the newly implemented endpoint: `GET /api/v1/marketingos/user-activity-proof/U_TEST_ID`.
3.  **Expected Outcome 1:**
    *   The HTTP response status code is `200 OK`.
    *   The response body is a JSON object similar to: `{"userId": "U_TEST_ID", "lastActivityAt": "YYYY-MM-DDTHH:mm:ss.sssZ"}`.
    *   The `lastActivityAt` value in the response accurately matches the recorded timestamp from the pre-condition, allowing for a small, acceptable delta (e.g., +/- 5 seconds) due to system processing time.
4.  **Check 2 (Logs):** Monitor application logs for any errors or warnings originating from the `marketingosController.js