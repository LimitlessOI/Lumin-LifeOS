# Amendment 12 Command Center Remediation: TODO-17-G6 - Goal Data Foundation

This memo outlines the next buildable slice for Amendment 12, specifically addressing TODO-17-G6, while adhering to the constraint that Goal tracking UI is deferred until Command Center (C&C) stability. The focus is on establishing the foundational data model and minimal API for Goals without introducing any user-facing UI.

## 1. Blocking Ambiguity or Founder Decision List

*   **Goal Definition Scope:** Clarify the minimal attributes required for a `Goal` entity at this stage (e.g., `id`, `name`, `description`, `status`, `targetDate`, `ownerId`). Avoid complex relationships or advanced tracking metrics until C&C stability allows for UI feature work.
*   **API Endpoint Naming:** Confirm preferred RESTful endpoint naming conventions for `/goals` within the Command Center API context.

## 2. Already-Settled Constraints

*   **BuilderOS-only Execution:** All changes are within the BuilderOS governed loop.
*   **No LifeOS/TSOS UI Impact:** No modifications to existing LifeOS user features or TSOS customer-facing surfaces.
*   **Goal Tracking UI Deferred:** Explicitly, no UI components for goal tracking are to be built or exposed in this slice.
*   **Minimal Implementation:** Focus on the smallest possible increment that provides value without violating deferral.

## 3. Smallest Buildable Next Slice

The smallest buildable slice involves defining the core `Goal` data model and exposing a minimal, internal-only API for creating and retrieving goals. This establishes the backend foundation without touching UI.

**Components:**
*   **Goal Data Model:** Define the schema for a `Goal` entity.
*   **Internal Goal Service/API:** Implement basic CRUD operations (Create, Read) for `Goal` entities, accessible only internally (e.g., via other backend services, not directly from a user-facing frontend).

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/data/models/Goal.js`: Define the Mongoose/Sequelize schema or equivalent data model for `Goal`.
*   `src/api/command-center/goals.js`: Implement a minimal set of API routes (e.g., `POST /api/command-center/goals`, `GET /api/command-center/goals/:id`, `GET /api/command-center/goals`).
*   `src/api/command-center/index.js`: Register the new `goals.js` routes.
*   `src/data/migrations/YYYYMMDD_create_goals_table.js`: (If using SQL) Database migration to create the `goals` table.

## 5. Required Verifier/Runtime Checks

*   **API Endpoint Accessibility:** Verify that the new `/api/command-center/goals` endpoints are accessible via internal service calls but *not* directly from any public-facing frontend.
*   **Data Model Persistence:** Confirm `Goal` entities can be successfully created and retrieved from the database.
*   **No UI Regression:** Automated UI tests confirm no new goal-related UI elements are present or existing UI is unaffected.
*   **Schema Validation:** Ensure `Goal` data adheres to the defined schema.

## 6. Stop Conditions

*   The `Goal` data model is defined and persisted.
*   Minimal internal API endpoints for `Goal` creation and retrieval are functional.
*   All verifier/runtime checks pass, especially the "no UI impact" and "no new UI" checks.
*   The system remains stable, and no regressions are introduced.