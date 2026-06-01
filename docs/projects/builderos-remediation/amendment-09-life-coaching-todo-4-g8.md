BuilderOS Remediation: Amendment 09 Life Coaching - Session History Persistence
This memo addresses the open task regarding "Coaching session history persistence not yet designed" from `docs/projects/AMENDMENT_09_LIFE_COACHING.md`. The goal is to enable the AI coach to remember previous sessions by persisting conversation turns.
---
1.  Blocking Ambiguity or Founder Decision List:
    *   **Data Model for Conversation Turn:**
        *   **Proposed fields (from blueprint):** `id` (UUID, primary key), `sessionId` (UUID, foreign key to `CoachingSession.id`), `timestamp` (DateTime, when the turn occurred), `speaker` (Enum: `USER`, `AI`), `messageContent` (Text, the actual message transcript or content).
        *   **Ambiguities/Decisions for `messageType`:** Define specific enum values (e.g., `TEXT`, `SYSTEM_MESSAGE`, `TOOL_CALL`, `TOOL_RESPONSE`). Propose `TEXT` and `SYSTEM_MESSAGE` as initial minimal set, or use `TEXT` for flexibility in this slice.
        *   **CoachingSession table definition:** Confirm minimal schema for `CoachingSession` (e.g., `id` UUID PK, `userId` UUID FK, `createdAt` DateTime) to support `ConversationTurn.sessionId` foreign key.
        *   **Optional `metadata` field:** Decision on including a `metadata` (JSONB) field for future extensibility (e.g., AI model details, tool outputs).
    *   **Retention Policy:** How long should conversation history be retained? (e.g., forever, 90 days, user-configurable).
    *   **Encryption at Rest:** Is encryption required for conversation content at rest?

2.  Already-Settled Constraints:
    *   Persistence must use existing LifeOS data patterns (e.g., PostgreSQL).
    *   No modification to LifeOS user features or TSOS customer-facing surfaces.
    *   Must support efficient retrieval of all turns for a given `sessionId`.
    *   Must support appending new turns to a session.

3.  Smallest Buildable Next Slice:
    *   Define and implement the `CoachingSession` database table (minimal schema: `id`, `userId`, `createdAt`).
    *   Define and implement the `ConversationTurn` database table schema, including `messageType` as a simple `TEXT` field initially.
    *   Implement