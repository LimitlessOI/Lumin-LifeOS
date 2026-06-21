<!-- SYNOPSIS: Amendment 09: Life Coaching - Proof G1149-100 -->

# Amendment 09: Life Coaching - Proof G1149-100

This document outlines the next smallest build slice for the Life Coaching amendment, focusing on enabling users to request a coaching session.

## Blueprint Note: Next Smallest Build Slice

### 1. Exact Missing Implementation or Proof Gap

The current platform lacks the functionality for a user to formally request or initiate a life coaching session with an available coach. This gap prevents users from progressing beyond browsing coaches to actual engagement.

### 2. Smallest Safe Build Slice to Close It

Implement the API endpoint and associated service logic to allow an authenticated user to submit a request for a life coaching session. This slice will focus on creating a pending session record, without implementing full coach availability checks or complex scheduling algorithms, which will be addressed in subsequent slices.

**Key Functionality:**
*   **API Endpoint:** `POST /api/life-coaching/sessions/request`
*   **Request Body:** `coachId` (string), `requestedTime` (ISO string), `durationMinutes` (number)
*   **Service Logic:** Validate input, create a new `LifeCoachSession` record in the database with `status: 'PENDING'`, linking it to the requesting user and the specified coach.

### 3. Exact Safe-Scope Files to Touch First

*   `src/api/life-coaching/sessions.routes.js`: Add a new `POST` route for `/request`.
*   `src/services/life-coaching/session.service.js`: Implement a new function, e.g., `requestSession(userId, coachId, requestedTime, durationMinutes)`.
*   `src/models/LifeCoachSession.js`: Ensure the model supports `userId`, `coachId`, `requestedTime`, `durationMinutes`, and `status` fields (if not already present).
*   `src/validators/life-coaching/session.validators.js`: Add a validation schema for the session request payload.

### 4. Verifier/Runtime Checks

*   **Positive API Test:** Send a `POST` request to `/api/life-coaching/sessions/request` with a valid `coachId`, `requestedTime` (future date/time), and `durationMinutes`.
    *   **Expected Outcome:** `HTTP 201 Created` response with the ID of the newly created session.
    *