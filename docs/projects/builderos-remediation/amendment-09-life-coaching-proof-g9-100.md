# Amendment 09: Life Coaching - Proof G9-100: Initial Session Scheduling Mechanism

This document outlines the proof-closing blueprint note for the initial implementation slice of the Life Coaching feature, specifically addressing the core mechanism for scheduling and managing individual coaching sessions.

---

### 1. Exact Missing Implementation or Proof Gap

The primary gap identified in the AMENDMENT_09_LIFE_COACHING blueprint is the concrete implementation of the data model and API surface required to *schedule* a life coaching session. While the concept of coaching sessions is defined, the technical means to persist and expose these sessions for creation and basic management is absent. This proof focuses on establishing the foundational data structure and a minimal API endpoint for session creation.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Defining the data schema for a `LifeCoachingSession`.
*   Implementing a service layer function to create a new `LifeCoachingSession` record.
*   Exposing a RESTful API endpoint (`POST /api/v1/life-coaching/sessions`) to allow authenticated users to schedule a new session.
*   This slice explicitly avoids complex scheduling logic (e.g., availability checks, recurring sessions), notification systems, or UI integration, focusing solely on the core data persistence and API entry point.

### 3. Exact Safe-Scope Files to Touch First

*   `src/data/schemas/LifeCoachingSession.js`: Define the schema for a life coaching session (e.g., `sessionId`, `coachId`, `clientId`, `scheduledTime`, `durationMinutes`, `status`).
*   `src/services/lifeCoachingService.js`: Implement `createSession(sessionData)` to handle business logic for session creation and interact with the data layer.
*   `src/api/v1/lifeCoachingRoutes.js`: Define the `POST /api/v1/life-coaching/sessions` route, which will call `lifeCoachingService.createSession`.
*   `src/api/v1/index.js`: Register `lifeCoachingRoutes` with the main API router.

### 4. Verifier/Runtime Checks

*   **API Integration Test:**
    *   **Request:** `POST /api/v1/life-coaching/sessions` with a valid payload (e.g., `{ coachId: 'uuid-coach-1', clientId: 'uuid-client-1', scheduledTime: '2024-07-20T10:00:00Z', durationMinutes: 60 }`).
    *   **Expected Response:** `HTTP 201 Created` with the newly created `LifeCoachingSession` object, including its generated `sessionId`.
*   **Database Verification:**
    *   After a successful API call, directly query the database for the `LifeCoachingSession` table.
    *   **Expected Outcome:** A new record exists matching the submitted data and the `sessionId` returned by the API.
*   **Service Layer Unit Test:**
    *   Run unit tests for `lifeCoachingService.createSession` to ensure it correctly validates input and interacts with the data access layer (e.g., mock database calls).

### 5. Stop Conditions if Runtime Truth Disagrees

*   If the `POST /api/v1/life-coaching/sessions` endpoint returns any HTTP status code other than `201 Created` for a valid request payload.
*   If the database does not contain a new `LifeCoachingSession` record matching the submitted data after a successful API call.
*   If the `lifeCoachingService.createSession` unit tests fail, indicating a logic or data access issue.
*   If existing, unrelated API endpoints or data models exhibit unexpected behavior or regressions after