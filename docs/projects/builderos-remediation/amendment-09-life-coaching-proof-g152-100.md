<!-- SYNOPSIS: Amendment 09: Life Coaching - Proof G152-100: Core Session Data Model -->

# Amendment 09: Life Coaching - Proof G152-100: Core Session Data Model

This document outlines the initial build slice to establish the foundational data model for Life Coaching Sessions, addressing the first critical proof gap (G152-100) identified in Amendment 09. This slice focuses purely on internal data persistence and access, strictly within BuilderOS safe scope.

## 1. Exact Missing Implementation or Proof Gap

The core data model and persistence layer for `LifeCoachingSession` entities are not yet defined or implemented. This prevents any session scheduling, tracking, or interaction, even at an internal, programmatic level. The absence of this foundational data structure is the immediate blocker for further development of life coaching features.

## 2. Smallest Safe Build Slice to Close It

This build slice will:
*   Define the `LifeCoachingSession` schema in the database.
*   Implement a basic repository layer for `LifeCoachingSession` CRUD operations (create, read by ID).
*   Implement a minimal service layer to orchestrate repository interactions.
*   Expose a strictly internal API endpoint (`/internal/life-coaching/sessions`) for BuilderOS to create and retrieve `LifeCoachingSession` records. This endpoint will not be exposed to LifeOS users or TSOS customers.

## 3. Exact Safe-Scope Files to Touch First

*   `src/db/schema.prisma`: Extend the existing Prisma schema to include the `LifeCoachingSession` model.
*   `src/repositories/lifeCoachingRepository.js`: New file. Implement functions for database interaction (e.g., `createSession`, `findSessionById`).
*   `src/services/lifeCoachingService.js`: New file. Implement business logic for sessions (e.g., `createLifeCoachingSession`, `getLifeCoachingSession`).
*   `src/routes/internal/lifeCoachingRoutes.js`: New file. Define internal API routes for session management (e.g., `POST /internal/life-coaching/sessions`, `GET /internal/life-coaching/sessions/:id`).
*   `src/app.js`: Modify to import and register the new `lifeCoachingRoutes` under the `/internal` prefix.

## 4. Verifier/Runtime Checks

1.  **Schema Migration:** Verify that `npx prisma migrate dev` (or equivalent) runs successfully, creating the `LifeCoachingSession` table and any necessary indices/constraints in the development database.
2.  **Internal API Creation:** Send a `POST` request to `/internal/life-coaching/sessions` with valid session data (e.g., `coachId`, `userId`, `scheduledTime`, `durationMinutes`, `status`).
    *   Expected: HTTP 201 Created, with the created session object in the response body, including a generated `id`.
    *   Database check: Verify that a new record exists in the `LifeCoachingSession` table with the provided data.
3.  **Internal API Retrieval:** Send a `GET` request to `/internal/life-coaching/sessions/{sessionId}` using the `id` obtained from the creation step.
    *   Expected: HTTP 200 OK, with the correct session object in the response body.
4.  **Error Handling (Invalid Input):** Send a `POST` request to `/internal/life-co