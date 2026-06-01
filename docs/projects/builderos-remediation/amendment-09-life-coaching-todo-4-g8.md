BuilderOS Remediation: Amendment 09 Life Coaching - Session History Persistence (Todo 4-G8)

This memo outlines the initial steps for implementing persistence of AI coaching session history, addressing the current limitation where the AI coach forgets previous interactions. This slice focuses exclusively on capturing and storing individual interaction records.

---

### 1. Blocking Ambiguity or Founder Decision List

*   **Interaction Data Model:** Define the exact schema for a single "coaching interaction record." Key fields to confirm: `userId`, `sessionId`, `timestamp`, `role` (e.g., 'user', 'ai'), `content` (text), `interactionId` (unique per interaction).
*   **Session Delimitation:** How are coaching sessions defined and ended? Is it time-based, explicit user action, or implicit? This impacts `sessionId` generation and management.
*   **Retention Policy:** What is the data retention period for coaching session history?
*   **Data Security:** Are specific encryption requirements for session history at rest needed beyond standard platform practices?

### 2. Already-Settled Constraints

*   The AI coach currently lacks memory of previous sessions.
*   The primary goal is to enable persistence of individual interaction records.
*   The implementation must not alter existing LifeOS user features or TSOS customer-facing surfaces.
*   Execution is governed by the BuilderOS loop.

### 3. Smallest Buildable Next Slice

Implement the foundational data persistence for individual coaching interaction records. This slice will:
*   Define a basic data model for a `CoachingInteraction` (e.g., `userId`, `sessionId`, `timestamp`, `role`, `content`).
*   Create a new database table `CoachingInteractions` to store these records.
*   Implement a service function `persistCoachingInteraction(interactionData)` that writes a single interaction record to the database.
*   Integrate a call to `persistCoachingInteraction` within the existing AI coaching flow immediately after a user input or AI response is generated, capturing the interaction.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/db/models/CoachingInteraction.js`: Define the database model/schema for `CoachingInteraction`.
*   `src/services/aiCoachingService.js`: Add the `persistCoachingInteraction` function and integrate its call within the existing AI interaction handling logic.
*   `src/types/coaching.js` (if exists): Add TypeScript/JSDoc type definitions for `CoachingInteraction`.
*   `src/db/migrations/<timestamp>-create-coaching-interactions-table.js`: Database migration script to create the `CoachingInteractions` table.

### 5. Required Verifier/Runtime Checks

*   **Unit Test (`CoachingInteraction` model):** Verify schema definition and basic CRUD operations for the `CoachingInteraction` model.
*   **Unit Test (`persistCoachingInteraction`):** Ensure the service function correctly writes a mock interaction record to the database.
*   **Integration Test (End-to-End):** Simulate a user sending a message to the AI coach and verify that a corresponding `CoachingInteraction` record is created in the database with correct `userId`, `sessionId`, `role`, and `content`.
*   **Schema Validation:** Confirm the `CoachingInteractions` table is created with the expected columns and types.

### 6. Stop Conditions

*   A new database table named `CoachingInteractions` exists and is accessible.
*   The `persistCoachingInteraction` service function is implemented and successfully stores interaction data.
*   Each user input and AI response within the coaching flow triggers a call to `persistCoachingInteraction`, storing the relevant data.
*   All specified unit and integration tests for this slice pass.