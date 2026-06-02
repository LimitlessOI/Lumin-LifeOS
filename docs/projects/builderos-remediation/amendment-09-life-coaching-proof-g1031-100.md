# Amendment 09: Life Coaching - Proof G1031-100: User Coaching Summary Data Access

## Proof Point: G1031-100 - Establish foundational data access for a user's assigned Life Coach and upcoming Life Coaching Sessions.

This proof point validates the ability to retrieve a user's basic life coaching summary, specifically their assigned coach ID and a list of their upcoming session IDs. This is a read-only, internal-facing data access proof, laying the groundwork for more complex coaching features. It does not involve user-facing UI changes or full session detail retrieval.

---

### Proof-Closing Blueprint Note

1.  **Exact missing implementation or proof gap:**
    The LifeOS platform currently lacks a defined data model and an internal API endpoint to retrieve a user's assigned Life Coach ID and a list of their upcoming Life Coaching Session IDs. This gap prevents any subsequent development of user-facing coaching features that rely on this foundational assignment data.

2.  **Smallest safe build slice to close it:**
    *   Define core TypeScript interfaces for `ILifeCoach` and `ILifeCoachingSession` (minimal fields: `id`).
    *   Define an interface for the user coaching summary: `ILifeCoachingUserSummary { coachId: string | null; sessionIds: string[]; }`.
    *   Implement a mock data service or a basic repository method within `LifeCoachingService` that returns hardcoded or mock `ILifeCoachingUserSummary` data for a given `userId`.
    *   Expose a new, read-only internal API endpoint, `/api/internal/life-coaching/user-summary`, which accepts a `userId` query parameter and returns the `ILifeCoachingUserSummary` data using the mock service.

3.  **Exact safe-scope files to touch first:**
    *   `src/types/life-coaching.d.ts` (New file for interfaces)
    *   `src/services/life-coaching/life-coaching.service.ts` (New file for service logic, or extend existing if applicable)
    *   `src/controllers/life-coaching.controller.ts` (New file for controller logic, or extend existing if applicable)
    *   `src/routes/internal/life-coaching.routes.ts` (New file for internal routes, or extend existing if applicable)

4.  **Verifier/runtime checks:**
    *   **Manual Test:** Execute `curl -X GET "http://localhost:3000/api/internal/life-coaching/user-summary?userId=testUser123"`
    *   **Expected Output:** A JSON object conforming to `ILifeCoachingUserSummary`, e.g., `{"coachId": "coach-abc-123", "sessionIds": ["session-