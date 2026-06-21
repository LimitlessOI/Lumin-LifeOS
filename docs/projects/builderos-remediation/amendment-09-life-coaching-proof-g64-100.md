<!-- SYNOPSIS: Documentation — Amendment 09 Life Coaching Proof G64 100. -->

Amendment 09: Life Coaching - Proof G64-100 Closure Note
Current Build Slice: G64-100 - Proof of Concept: Basic Coach Profile API

1. Exact Missing Implementation or Proof Gap
The current slice `G64-100` established the foundational internal API endpoint `/api/internal/coach/profile` and its basic routing definition. The proof gap is the lack of functional implementation for retrieving a coach's own profile data through this endpoint. Currently, the endpoint likely returns a placeholder, an empty response, or a generic error.

2. Smallest Safe Build Slice to Close It
**Slice ID:** G64-101
**Description:** Implement the GET operation for `/api/internal/coach/profile` to retrieve the authenticated coach's own profile data. This slice will focus on fetching data from the underlying data store and returning it in a defined schema, assuming the coach's identity is available from the request context (e.g., via authentication middleware).

3. Exact Safe-Scope Files to Touch First
*   `src/api/internal/coach/profile/index.js`: Extend to define the GET route and link to the handler.
*   `src/api/internal/coach/profile/handlers.js`: Add `getCoachProfile` function to fetch and format profile data.
*   `src/db/repositories/coachProfileRepository.js`: Implement `getProfileById` to retrieve data from the database.
*   `src/api/internal/coach/profile/schemas.js`: Define the response schema for `GET /api/internal/coach/profile`.
*   `test/unit/api/internal/coach/profile/handlers.test.js`: Add unit tests for `getCoachProfile`.
*   `test/integration/api/internal/coach/profile.test.js`: Add integration tests for `GET /api/internal/coach/profile`.

4. Verifier/Runtime Checks
*   **Unit Tests:** All new unit tests for `getCoachProfile` pass, covering success and edge cases (e.g., profile not found).
*   **Integration Tests:** `GET /api/internal/coach/profile` returns a 200 OK status with a valid coach profile JSON object for an authenticated request.
*   **Manual Verification:** Using `curl` or a browser, an authenticated request to `/api/internal/coach/profile` successfully retrieves the expected profile data.
*   **Schema Validation:** The returned JSON adheres to the `coachProfileSchema` defined in `src/api/internal/coach/profile/schemas.js`.
*   **Logging:** Successful retrieval operations are logged appropriately without errors.

5. Stop Conditions if Runtime Truth Disagrees
*   The endpoint returns a 4xx or 5xx status code for valid, authenticated requests.
*   The returned profile data is inconsistent, incomplete, or malformed according to the defined schema.
*   The endpoint exposes sensitive data not intended for the coach's own profile view.
*   Performance degradation: Average response time for `GET /api/internal/coach/profile` exceeds 200ms under typical load.
*   Security vulnerability: Unauthorized access to other coaches' profiles is possible.