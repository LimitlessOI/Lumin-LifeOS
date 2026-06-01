BuilderOS Remediation: AMENDMENT_12_COMMAND_CENTER - Goal Tracking UI (TODO-17-G6)

This memo addresses the "Goal tracking UI is partial — deferred until C&C is stable enough for feature work" task from `AMENDMENT_12_COMMAND_CENTER.md`. The objective is to define the smallest buildable next slice to advance this task without violating the deferral constraint.

### 1. Blocking Ambiguity or Founder Decision List

*   **Definition of "C&C stable enough":** The blueprint defers full UI work until Command & Control (C&C) is stable. For this remediation, "stable enough" is interpreted as allowing foundational backend and data model work for Goal Tracking, without requiring C&C UI integration or exposing Goal Tracking UI to end-users. A founder decision may be required to formalize a more precise definition for future UI phases.
*   **Initial Goal Schema Details:** Specific fields for a `Goal` entity (e.g., `targetValue`, `currentValue`, `progressMetricType`) are not fully detailed. An initial, minimal schema will be proposed, but founder input may be needed for complex tracking requirements.

### 2. Already-Settled Constraints

*   Full Goal Tracking UI implementation is explicitly deferred.
*   No modifications to existing LifeOS user features or TSOS customer-facing surfaces.
*   All work must remain within BuilderOS-only governed loop execution.
*   New components must follow existing Node/ESM patterns and project structure.
*   Focus is on foundational data model and internal service layer.

### 3. Smallest Buildable Next Slice

The smallest buildable next slice focuses on establishing the core data model and internal service layer for Goal tracking, without any user-facing UI.

*   **Goal Data Model Definition:** Define a `Goal` entity with essential fields: `id`, `name`, `description`, `status` (e.g., 'pending', 'active', 'completed', 'archived'), `ownerId`, `createdAt`, `updatedAt`.
*   **Persistence Layer:** Implement database schema migration to create a `goals` table.
*   **Internal Goal Service:** Develop a `GoalService` module providing basic CRUD (Create, Read, Update, Delete) operations for `Goal` entities. This service will be accessible only internally by BuilderOS components.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/models/Goal.js`: Define the Goal data model/schema.
*   `src/services/goalService.js`: Implement the internal Goal CRUD logic.
*   `src/db/migrations/YYYYMMDDHHMMSS_create_goals_table.js`: Database migration script for the `goals` table. (The `YYYYMMDDHHMMSS` placeholder will be replaced with an actual timestamp during generation).
*   `src/tests/unit/goalService.test.js`: Unit tests for the `GoalService`.

### 5. Required Verifier/Runtime Checks

*   **Schema Verification:** Database verifier confirms the `goals` table exists with the specified columns and appropriate indexing.
*   **Unit Test Coverage:** `goalService.test.js` achieves high test coverage for all CRUD operations.
*   **No UI Impact:** Runtime checks confirm no new UI elements related to Goal Tracking are rendered or accessible to LifeOS/TSOS users.
*   **Internal Access Only:** Verifier confirms `GoalService` endpoints (if any internal ones are exposed for BuilderOS) are not publicly accessible.

### 6. Stop Conditions

*   The `Goal` data model is fully defined and persisted in the database.
*   The `GoalService` provides robust, tested internal CRUD operations.
*   No user-facing UI for Goal Tracking has been implemented or exposed.
*   All new code adheres to established architectural patterns and quality standards.
*   The system remains stable, with no regressions introduced.