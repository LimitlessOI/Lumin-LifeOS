BuilderOS Remediation: Amendment 09 Life Coaching - Session History Persistence
This memo addresses the open task regarding "Coaching session history persistence not yet designed" from `docs/projects/AMENDMENT_09_LIFE_COACHING.md`. The goal is to enable the AI coach to remember previous sessions by persisting conversation turns.
---

1.  **Blocking Ambiguity or Founder Decision List:**
    *   **Data Model for Conversation Turn:**
        *   Proposed fields: `id` (UUID, primary key), `sessionId` (UUID, foreign key to `CoachingSession.id`), `timestamp` (DateTime, when the turn occurred), `speaker` (Enum: `USER`, `AI`), `messageContent` (Text, the actual message transcript or content), `messageType`