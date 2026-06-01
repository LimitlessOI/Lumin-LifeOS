# Amendment 09: Life Coaching - Proof G40-100

## Proof-Closing Blueprint Note

This document outlines the proof for the initial foundational build slice of the Life Coaching feature, specifically focusing on establishing the core `CoachingSession` entity and its basic API interaction. This addresses the `g40-100` goal of proving fundamental data persistence and API integration.

---

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a demonstrable, persistent `CoachingSession` entity accessible via a basic API. This proof aims to close the gap by establishing the data model, persistence layer integration, and a minimal set of API endpoints for creating and retrieving `CoachingSession` instances.

### 2. Smallest Safe Build Slice to Close It

This slice focuses on the core `CoachingSession` entity:
*   **Define `CoachingSession` Interface/Type:** Establish the TypeScript interface for a `CoachingSession` with essential properties (e.g., `id`, `clientId`, `coachId`, `startTime`, `endTime`, `status`, `notes`).
*   **Implement `CoachingSessionRepository`:** Create or extend a repository to handle CRUD operations for `CoachingSession` entities, specifically `create` and `findById`.
*   **Expose `CoachingSession` API Endpoints:**
    *   `POST /api/coaching/sessions`: To create a new `CoachingSession`.
    *   `GET /api/coaching/sessions/:id`: To retrieve a `CoachingSession` by its ID.
*   **Basic Controller Logic:** Implement minimal controller logic to handle request parsing, call repository methods, and return appropriate API responses.

### 3. Exact Safe-Scope Files to Touch First

*   `src/domain/coaching/CoachingSession.ts` (New file: Defines the `ICoachingSession` interface)
*   `src/infra/db/repositories/CoachingSessionRepository.ts` (New file: Implements persistence logic for `ICoachingSession`)
*   `src/api/controllers/coachingController.ts` (New file: Contains controller methods for `CoachingSession` API)
*   `src/api/routes/coachingRoutes.ts` (New file: Defines API routes for `CoachingSession`)
*   `src/api/index.ts` (Modification: Register `coachingRoutes` with the main API router)

### 4. Verifier/Runtime Checks

1.  **Create Session:**
    *   **Request:** `POST /api/coaching/sessions`
    *   **Body:**
        ```json
        {
            "clientId": "user-123",
            "coachId": "coach-456",
            "startTime": "2024-07-20T10:00:00Z",
            "endTime": "2024-07-20T11:00:00Z",