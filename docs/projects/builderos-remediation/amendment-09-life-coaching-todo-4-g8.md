The verifier expects executable code, but the instruction explicitly asks for a markdown file. This is a contradiction. I will proceed with generating the markdown content as requested by the instruction.
---
BuilderOS Remediation: Amendment 09 Life Coaching - Session History Persistence

This memo addresses the open task regarding "Coaching session history persistence not yet designed" from `docs/projects/AMENDMENT_09_LIFE_COACHING.md`. The goal is to enable the AI coach to remember previous sessions by persisting conversation turns.

---

1.  **Blocking Ambiguity or Founder Decision List:**
    *   **Session Turn Data Model:** Define the exact schema for a "conversation turn" (e.g., `sessionId`, `turnIndex`, `speaker` (USER/AI), `messageContent`, `timestamp`, `modelUsed`, `tokenCount`).
    *   **Storage Mechanism:** Confirm the chosen database (e.g., existing SQL, new SQL table, NoSQL). Assume SQL for this slice.
    *   **Retrieval Strategy:** How much history is retrieved for context? (e.g., last N turns, last X tokens, full session). This slice focuses on *persistence*, not retrieval strategy.

2.  **Already-Settled Constraints:**
    *   **Goal:** Enable AI coach to remember previous sessions by persisting conversation turns.
    *   **Scope:** BuilderOS-only internal changes. No modifications to LifeOS user features or TSOS customer-facing surfaces in this slice.
    *   **Source Blueprint:** `docs/projects/AMENDMENT_09_LIFE_COACHING.md`.

3.  **Smallest Buildable Next Slice:**
    *   **Data Model Definition:** Define a minimal `SessionTurn` type (e.g., `sessionId: string`, `turnIndex: number`, `speaker: 'USER' | 'AI'`, `messageContent: string`, `timestamp: Date`).
    *   **Database Table Creation:** Create a new SQL table, `ai_coach_session_turns`, to store these turns.
    *   **Persistence Service:** Implement a new internal service (`sessionHistoryService`) with methods to `saveTurn(turnData)` and `getTurnsForSession(sessionId)`.
    *   **Internal Integration:** Modify the core AI coach module to call `sessionHistoryService.saveTurn()` after each user input and AI response.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First:**
    *   `db/migrations/YYYYMMDD_create_ai_coach_session_turns.sql` (new file)
    *   `src/lib/ai-coach/sessionHistoryService.js` (new file)
    *   `src/lib/ai-coach/types.js` (add `SessionTurn` type, or new `src/lib/ai-coach/sessionTypes.js`)
    *   `src/lib/ai-coach/index.js` (or relevant core AI coach module, for integration)

5.  **Required Verifier/Runtime Checks:**
    *   **Database Schema Check:** Verify `ai_coach_session_turns` table exists with correct columns.
    *   **Unit Tests:** `sessionHistoryService` can successfully save and retrieve turns.
    *   **Integration Tests:** Verify that the internal AI coach flow calls `sessionHistoryService.saveTurn()` for both user and AI turns.
    *   **No User-Facing Changes:** Automated checks confirm no new routes, UI elements, or API endpoints are exposed.

6.  **Stop Conditions:**
    *   `ai_coach_session_turns` table is deployed and accessible.
    *   `sessionHistoryService` is implemented and passes unit tests for saving/retrieving.
    *   Internal AI coach logic is updated to persist turns via the new service.
    *   All specified verifier/runtime checks pass.
    *   No user-facing changes are introduced.