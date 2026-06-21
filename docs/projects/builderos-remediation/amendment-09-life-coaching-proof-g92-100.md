<!-- SYNOPSIS: Amendment 09 Life Coaching Proof - Group g92-100: Session Completion and Notes -->

# Amendment 09 Life Coaching Proof - Group g92-100: Session Completion and Notes

This document serves as a proof-closing blueprint note for the `g92-100` build slice of Amendment 09, focusing on the capability for a coach to mark a coaching session as complete and add session notes.

---

### 1. Exact Missing Implementation or Proof Gap

The LifeOS platform currently lacks the backend implementation to allow an authenticated `Coach` user to transition a `CoachingSession`'s status to `completed` and simultaneously persist `sessionNotes` associated with that specific session. This gap prevents accurate historical tracking, post-session review, and the formal closure of coaching engagements within the system. The existing `CoachingSession` model supports a `status` field and a `sessionNotes` field, but the API and service layer logic for this specific state transition and data update are absent.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing a new API endpoint and the corresponding service layer logic to update a `CoachingSession`'s status to `completed` and record `sessionNotes`. This slice will focus exclusively on the backend data manipulation and validation, ensuring data integrity and proper authorization, without introducing any new UI components.

### 3. Exact Safe-Scope Files to Touch First

*   `src/api/coaching/sessions/routes.js`: Add a new `PATCH` route for `/api/coaching/sessions/:sessionId/complete`. This route will accept `sessionNotes` in the request body.
*   `src/services/coachingSessionService.js`: Implement a new asynchronous function, `completeSession(sessionId, coachId, sessionNotes)`, responsible for:
    *   Retrieving the `CoachingSession` by `sessionId`.
    *   Verifying that the `coachId` matches the session's assigned coach.
    *   Validating the `sessionNotes` (e.g., length, type).
    *   Updating the session's `status` to `completed` and persisting `sessionNotes`.
    *   Handling cases where the session is already completed or