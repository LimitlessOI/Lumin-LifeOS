# Amendment 09 Life Coaching - Proof G28-100: Initial Coaching Session Data Model & Mock Read

This proof point establishes the foundational data model for a `CoachingSession` and a minimal mock read operation to retrieve a session by its ID. This validates the ability to define core coaching data types and integrate a basic data access pattern within the LifeOS platform.

## 1. Exact missing implementation or proof gap

The current platform lacks a defined data model for `CoachingSession` entities and a basic mechanism to retrieve them, even in a mocked capacity. This gap prevents any further development of coaching-specific features that rely on session data.

## 2. Smallest safe build slice to close it

Define the `CoachingSession` interface/type and implement a mock repository function that returns a hardcoded `CoachingSession` by ID. This slice focuses purely on data type definition and a placeholder read function, avoiding actual database integration or complex business logic initially.

## 3. Exact safe-scope files to touch first

*   `src/modules/coaching/coaching.types.ts`: Define the `CoachingSession` interface.
*   `src/modules/coaching/coaching.repository.ts`: Implement a mock `getCoachingSessionById(id: string): Promise<CoachingSession | null>` that returns a hardcoded session if `id === 'mock-session-123'` and `null` otherwise.

## 4. Verifier/runtime checks

*   **Unit Test**: Write a unit test for `src/modules/coaching/coaching.repository.ts` to assert that:
    *   `getCoachingSessionById('mock-session-123')` returns the expected mock `CoachingSession` object.
    *   `getCoachingSessionById('non-existent-id')` returns `null`.
*   **Type Check**: Ensure `tsc` passes without errors across the codebase, validating the `CoachingSession` type definition and its usage in the repository.

## 5. Stop conditions if runtime truth disagrees

*   If `tsc` fails due to type mismatches related to `CoachingSession` or its usage in `coaching.repository.ts`.
*   If the unit tests for `coaching.repository.ts` fail, indicating incorrect data retrieval or mock behavior.
*   If the defined `CoachingSession` structure does not align with the high-level requirements outlined in `AMENDMENT_09_LIFE_COACHING.md` (e.g., missing critical fields like `coachId`, `clientId`, `startTime`, `duration`, `status`).

---METAD