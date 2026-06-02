Amendment 09: Life Coaching - Proof G671-100
This document serves as a proof-closing blueprint note for the initial implementation slice of the Life Coaching feature, specifically addressing the foundational data model and a basic internal service for session management.
---
1. Exact missing implementation or proof gap:
The core data model for `LifeCoachingSession` and a basic internal service for session management are missing. This includes defining the schema for `LifeCoachingSession` (e.g., `sessionId`, `coachId`, `clientId`, `startTime`, `endTime`, `status`, `notes`) and implementing a minimal internal API to create, retrieve, and update these sessions. The current gap prevents any further development of coaching session logic or scheduling.

2. Smallest safe build slice to close it:
This slice will establish the foundational data model and a basic internal service for `LifeCoachingSession`.
- Define the `LifeCoachingSession` interface/type.
- Implement the data model (e.g., Mongoose schema or ORM definition) for `LifeCoachingSession`.
- Create an internal `LifeCoachingService` with methods:
    - `createSession(sessionData: Partial<LifeCoachingSession>): Promise<LifeCoachingSession>`
    - `getSessionById(sessionId: string): Promise<LifeCoachingSession | null>`
    - `updateSession(sessionId: string, updates: Partial<LifeCoachingSession>): Promise<LifeCoachingSession | null>`
This slice focuses purely on internal data persistence and retrieval, without exposing any external APIs or modifying user-facing surfaces.

3. Exact safe-scope files to touch first:
- `src/types/lifeCoaching.d.ts` (New: Defines TypeScript interfaces for `LifeCoachingSession` and related types.)
- `src/models/LifeCoachingSession.ts` (New: Implements the data model/schema for `LifeCoachingSession` using the chosen ORM/ODM.)
- `src/services/lifeCoachingService.ts` (New: Contains the business logic for session management, interacting with the `LifeCoachingSession` model.)
- `src/tests/unit/lifeCoachingService.test.ts` (New: Unit tests for the `LifeCoachingService` methods.)
- `src/tests/integration/lifeCoachingSession.integration.test.ts` (New: Integration tests for data persistence and retrieval.)

4. Verifier/runtime checks:
- **Unit Tests Pass:** All tests in `src/tests/unit/lifeCoachingService.test.ts` must pass, verifying correct service logic and data model interactions.
- **Integration Tests Pass:** All tests in `src/tests/integration/lifeCoachingSession.integration.test.ts` must pass, confirming successful data persistence, retrieval, and updates against a test database.
- **Schema Validation:** Verify that the `LifeCoachingSession` model correctly enforces its defined schema constraints (e.g., required fields, data types) during creation and update operations.
- **No External Surface Impact:** Runtime monitoring confirms no new routes, endpoints, or UI components are exposed or modified on LifeOS user features or TSOS customer-facing surfaces.
- **Dependency Check:** Ensure no new external dependencies are introduced without explicit approval.

5. Stop conditions if runtime truth disagrees:
- Any unit or integration test failure.
- Database schema validation errors during model instantiation or data operations.
- Unintended side effects observed in existing LifeOS or TSOS functionality.
- Performance degradation in database operations related to session management.
- Failure to correctly persist or retrieve `LifeCoachingSession` data.
- Introduction of new external dependencies or changes to existing ones without explicit blueprint approval.