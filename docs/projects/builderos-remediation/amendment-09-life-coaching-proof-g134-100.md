### Proof-Closing Blueprint Note: `g134-100` - Life Coaching Session View

This note closes the proof for `g134-100` and outlines the next smallest build slice.

1.  **Exact missing implementation or proof gap:**
    The current state (post-`g134-100`) establishes the `LifeCoachSession` data model and basic persistence. The gap is the user-facing capability to securely retrieve and display their own scheduled life coaching sessions. Specifically, the API endpoint and corresponding data retrieval logic for an authenticated user to fetch their own sessions are missing.

2.  **Smallest safe build slice to close it:**
    Implement a read-only API endpoint (`GET /api/v1/life-coaching/sessions`) that, when authenticated, returns a list of the requesting user's upcoming or past life coaching sessions. This slice focuses solely on secure data retrieval and presentation, without modification capabilities.

3.  **Exact safe-scope files to touch first:**
    *   `src/api/v1/life-coaching/sessions/get.js`: New file for the GET endpoint handler.
    *   `src/api/v1/life-coaching/sessions/index.js`: Update to export the new GET handler.
    *   `src/api/v1/index.js`: Update to include the new `life-coaching/sessions` router.
    *   `src/services/lifeCoachingService.js`: Add a new function `getUserSessions(