### AMENDMENT_41_MARKETINGOS Proof-Closing Blueprint Note: G953-100

This document serves as the SSOT foundation for closing the implementation gap identified in AMENDMENT_41_MARKETINGOS.

**1. Exact missing implementation or proof gap:**
The `userEngagementScore` attribute, as defined in AMENDMENT_41_MARKETINGOS, is not yet exposed via a dedicated LifeOS API endpoint for MarketingOS consumption. This attribute is critical for enabling targeted marketing campaigns and ensuring a Single Source of Truth for user engagement metrics across platforms.

**2. Smallest safe build slice to close it:**
Implement a new GET endpoint `/api/v1/users/:userId/engagement` within the LifeOS API. This endpoint will retrieve the `userId` from the path, call an existing or newly created service function to compute/fetch the `userEngagementScore` for that user, and return it in a standardized JSON format. This slice focuses solely on exposing the data without altering existing LifeOS user features or TSOS customer-facing surfaces.

**3. Exact safe-scope files to touch first:**
*   `src/api/routes/userRoutes.js`: Add a new route definition for `GET /api/v1/users/:userId/engagement`.
*   `src/api/controllers/userController.js`: Implement a new controller function (e.g., `getEngagementScore`) to handle the request, validate `userId`, and orchestrate the service call.
*   `src/services/userService.js`: Add or extend a function (e.g., `getUserEngagementScore(userId)`) responsible for calculating or retrieving the `userEngagementScore` based on existing LifeOS data models.

**4. Verifier/runtime checks:**
*   **Unit Tests:**
    *   Verify `userService.getUserEngagementScore(userId)` returns a valid numeric score (e.g., `0 <= score <= 100`) for known users.
    *   Verify `userController.getEngagementScore` correctly extracts `userId` and invokes `userService.getUserEngagementScore`.
    *   Verify error handling in `userController` for invalid or non-existent `userId` (e.g., 400/404 responses).
*   **Integration Tests:**
    *   `GET /api/v1/users/:userId/engagement` returns `200 OK` with a JSON payload `{ "userId": "...", "userEngagementScore": N }` for an existing, valid user.
    *   `GET /api/v1/users/:userId/engagement` returns `404 Not Found` for a non-existent `userId`.
    *   `GET /api/v1/users/:userId/engagement` returns `400 Bad Request` for an invalid `userId` format.
    *   Verify the response JSON schema strictly matches `{"userId": string, "userEngagementScore": number}`.
*   **Monitoring:**
    *   Monitor API latency for the new endpoint (`/api/v1/users/:userId/engagement`).
    *   Monitor error rates for the new endpoint.

**5. Stop conditions if runtime truth disagrees:**
*   The `userEngagementScore` returned by the API for a given `userId` does not align with internal LifeOS calculations or existing reporting for the same user, indicating a data integrity issue.
*   API latency for `GET /api/v1/users/:userId/engagement` consistently exceeds 50ms (P95) in staging or production environments.
*   The error rate for the new endpoint exceeds 0.1% in production within the first 24 hours post-deployment.
*   Schema validation fails for the API response, indicating a contract breach.
*   Any observed performance degradation or unexpected side effects on existing user-related APIs or database operations.