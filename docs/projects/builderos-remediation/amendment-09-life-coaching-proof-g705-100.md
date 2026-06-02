AMENDMENT 09: Life Coaching Integration - Proof G705-100
Blueprint Note: Initial CoachProfile Data Model & API Proof

This note closes the proof for the initial build slice related to the `CoachProfile` data model and its foundational apiEPs, as outlined in `docs/projects/AMENDMENT_09_LIFE_COACHING.md`.

---

### Next Build Slice: Coaching Session Management Core Logic

This section outlines the next smallest build slice to advance the Life Coaching Integration.

**1. Exact Missing Implementation or Proof Gap:**
The current proof covers the `CoachProfile` data model and its foundational API endpoints (CRUD for coach profiles). The missing implementation gap is the core business logic for managing coaching sessions, including session creation, scheduling, status updates, and linking coaches and clients. This involves orchestrating interactions between `CoachProfile`, `ClientProfile` (assumed to exist or be part of a parallel stream), and a new `SessionRecord` data model.

**2. Smallest Safe Build Slice to Close It:**
Implement the core service layer for `CoachingSession` management. This slice focuses on the backend logic and API endpoints necessary to:
*   Define a `CoachingSession` data model (e.g., `SessionRecord`).
*   Create, retrieve, update, and delete (CRUD) coaching sessions.
*   Associate sessions with a `CoachProfile` and `ClientProfile`.
*   Implement basic session state transitions (e.g., `scheduled`, `completed`, `cancelled`).

**3. Exact Safe-Scope Files to Touch First:**
*   `src/models/SessionRecord.js`: Define the Mongoose/Sequelize schema and model for coaching sessions.
*   `src/dal/sessionRecordDAL.js`: Data Access Layer for `SessionRecord` CRUD operations.
*   `src/services/coachingSessionService.js`: Business logic for session management (e.g., `createSession`, `updateSessionStatus`, `getCoachSessions`).
*   `src/api/coachRoutes.js` (or `src/api/sessionRoutes.js` if dedicated): Add new API endpoints for session management (e.g., `POST /api/sessions`, `GET /api/coaches/:coachId/sessions`).
*   `src/tests/unit/coachingSessionService.test.js`: Unit tests for the new service.
*   `src/tests/integration/sessionApi.test.js`: Integration tests for the new API endpoints.

**4. Verifier/Runtime Checks:**
*   **Unit Tests:** All tests in `src/tests/unit/coachingSessionService.test.js` pass.
*   **Integration Tests:** All tests in `src/tests/integration/sessionApi.test.js` pass, covering successful session creation, retrieval, update, and deletion via API.
*   **Schema Validation:** Database inserts/updates for `SessionRecord` adhere to defined schema constraints.
*   **API Response Validation:** API endpoints return expected data structures and HTTP status codes.
*   **Basic Data Integrity:** Verify that sessions are correctly linked to coaches and clients.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If `CoachProfile` or `ClientProfile` data models are found to be unstable, incomplete, or require significant refactoring that impacts session linking.
*