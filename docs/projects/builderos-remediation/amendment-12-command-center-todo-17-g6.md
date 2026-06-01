AMENDMENT 12 COMMAND CENTER - Goal Tracking UI Remediation (TODO-17-G6)

This memo addresses the "Goal tracking UI is partial — deferred until C&C is stable enough for feature work" task from `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`. It outlines the smallest buildable next slice for this deferred feature, focusing on foundational internal BuilderOS components.

---

### 1. Blocking Ambiguity / Founder Decision List

*   **Definition of "Foundational":** Clarify the precise scope of "foundational" work for goal tracking that does not involve any user interface or external API exposure. The current interpretation focuses on internal data models and service logic within BuilderOS.
*   **Goal Granularity:** Confirm the initial level of detail required for a "Goal" entity (e.g., simple name/status vs. detailed metrics/sub-goals). This memo assumes a basic, high-level goal structure.

### 2. Already-Settled Constraints

*   **BuilderOS-Only Scope:** All implementation must reside strictly within BuilderOS internal modules.
*   **No LifeOS/TSOS Impact:** No modifications to LifeOS user features or TSOS customer-facing surfaces.
*   **UI Deferred:** Goal tracking user interface components are explicitly excluded from this slice.
*   **Blueprint Adherence:** The slice must not violate the `AMENDMENT_12_COMMAND_CENTER.md` blueprint.

### 3. Smallest Buildable Next Slice

Implement the core internal data model and a basic service for managing goals within BuilderOS. This slice focuses on establishing the backend foundation without any UI or external API exposure.

*   **Goal Data Model:** Define an internal `Goal` interface/type with properties:
    *   `id: string` (UUID)
    *   `name: string`
    *   `description: string` (optional)
    *   `targetValue: number` (optional, e.g., for quantitative goals)
    *   `currentValue: number` (optional, tracks progress)
    *   `unit: string` (optional, e.g., "percent", "count")
    *   `startDate: Date`
    *   `endDate: Date` (optional)
    *   `status: 'pending' | 'in_progress' | 'completed' | 'archived'`
    *   `ownerId: string` (internal BuilderOS entity ID)
    *   `createdAt: Date`
    *   `updatedAt: Date`
*   **Internal Goal Service:** Implement a BuilderOS internal service (`GoalService`) providing basic CRUD operations:
    *   `createGoal(goalData: Partial<Goal>): Promise<Goal>`
    *   `getGoal(id: string): Promise<Goal | null>`
    *   `updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null>`
    *   `listGoals(filter?: GoalFilter): Promise<Goal[]>` (for internal BuilderOS use)

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/builder-os/goals/goal.model.ts`: Defines the `Goal` interface and related types.
*   `src/builder-os/goals/goal.service.ts`: Implements the `GoalService` with internal CRUD logic.
*   `src/builder-os/goals/goal.repository.ts`: Handles interaction with the underlying data store for goals.
*   `src/builder-os/goals/index.ts`: Exports the `Goal` model and `GoalService` for internal BuilderOS consumption.
*   `src/builder-os/db/schema/goals.ts`: Defines the database schema for goals.

### 5. Required Verifier/Runtime Checks

*   **Type Safety:** Ensure `goal.model.ts` types are strictly enforced across `goal.service.ts`.
*   **Unit Tests:** Comprehensive unit tests for `GoalService` methods (`createGoal`, `getGoal`, `updateGoal`, `listGoals`) covering data integrity, edge cases, and status transitions.
*   **No UI/API Exposure:** Automated checks (e.g., linting rules, build-time checks) to confirm no new UI components or external API routes related to goal tracking are introduced.
*   **Internal-Only Usage:** Verify that `GoalService` is only consumed by other internal BuilderOS modules.

### 6. Stop Conditions

*   The `Goal` data model is fully defined and validated.
*   The internal `GoalService` is implemented with all specified CRUD operations.
*   All associated unit tests pass with 100% coverage for `goal.service.ts`.
*   No UI or external API surface for goal tracking has been introduced.
*   The implementation adheres strictly to BuilderOS internal scope.