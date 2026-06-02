Proof-Closing Blueprint Note: `g134-100` - Life Coaching Session View
This note closes the proof for `g134-100` and outlines the next smallest build slice.

1.  Exact missing implementation or proof gap:
    The current state (post-`g134-100`) establishes the `LifeCoachSession` data model and basic persistence. The gap is the user-facing capability to securely retrieve and display their own scheduled life coaching sessions. Specifically, the apiEP and corresponding data retrieval logic for an authenticated user to fetch their own sessions are missing.

2.  Smallest safe build slice to close it:
    Implement a read-only apiEP (`GET /api/v1/life-coaching/sessions`) that, when authenticated, returns a list of the requesting user's upcoming or past life coaching sessions. This slice focuses solely on secure data retrieval and presentation, without modification capabilities.

3.  Exact safe-scope files to touch first:
    -   `src/api/v1/life-coaching/sessions/get.js`: New file for the GET endpoint handler.
    -   `src/api/v1/life-coaching/sessions/index.js`: Update to export the new GET handler.
    -   `src/api/v1/index.js`: Update to include the new `life-coaching/sessions` router.
    -   `src/services/lifeCoachingService.js`: Add a new function `getUserSessions(userId)`.

4.  Verifier/runtime checks:
    -   **Unit Tests:**
        -   `src/api/v1/life-coaching/sessions/get.test.js`: Verify 401 for unauthenticated requests. Verify 200 and correct session data for authenticated users. Test empty session list.
        -   `src/services/lifeCoachingService.test.js`: Verify `getUserSessions` correctly queries and formats data for a given `userId`.
    -   **Integration Tests:**
        -   Send `GET /api/v1/life-coaching/sessions` with a valid user token; assert 200 OK and expected session array structure.
        -   Send `GET /api/v1/life-coaching/sessions` without a token; assert 401 Unauthorized.
    -   **Manual QA:**
        -   As an authenticated user, verify the UI correctly displays personal life coaching sessions.
        -   As an authenticated user with no sessions, verify the UI handles this state gracefully.

5.  Stop conditions if runtime truth disagrees:
    -   Unit or integration tests for the new endpoint or service function fail, indicating incorrect data retrieval, authentication issues, or improper data formatting.
    -   Manual QA reveals that authenticated users cannot retrieve their own sessions, retrieve incorrect sessions, or encounter unexpected server errors.
    -   Performance monitoring indicates unacceptable latency or resource consumption for the new endpoint under typical load.