<!-- SYNOPSIS: Amendment 09 Life Coaching Proof: G10-100 Remediation -->

# Amendment 09 Life Coaching Proof: G10-100 Remediation

This document outlines the next smallest build slice to close the proof gap for G10-100: Proof of Concept: Basic Coaching Session Flow, as defined in `docs/projects/AMENDMENT_09_LIFE_COACHING.md`.

---

**Proof-Closing Blueprint Note: G10-100 Initial Session Request**

1.  **Exact missing implementation or proof gap:**
    The initial capability for a client user to formally request a coaching session, resulting in a persisted session record with a `requested` status. This addresses the first bullet point of G10-100's scope: "User (Client) can initiate a coaching session request."

2.  **Smallest safe build slice to close it:**
    Implement the API endpoint and associated service logic to allow an authenticated client to create a new coaching session request. This involves defining the `CoachingSession` data model, a service function to handle creation and persistence, and a controller/route to expose this functionality via a POST request.

3.  **Exact safe-scope files to touch first:**
    *   `src/models/CoachingSession.js`: Define the Mongoose schema/model for `CoachingSession` including fields like `clientId`, `coachId`, `status` (defaulting to `requested`), `requestedAt`, `notes`.
    *   `src/services/coachingSessionService.js`: Implement `createCoachingSession(clientId, coachId, notes)` to validate input and persist the new session.
    *   `src/controllers/coachingSessionController.js`: Implement `requestCoachingSession(req, res)` to parse request body, call the service, and send appropriate HTTP responses.
    *   `src/routes/coachingSessionRoutes.js`: Define a new