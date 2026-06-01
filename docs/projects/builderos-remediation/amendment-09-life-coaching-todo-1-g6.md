BuilderOS Remediation: Amendment 09 Life Coaching - Todo 1 (G6)
This memo outlines the first buildable slice for remediating the inline Life Coaching feature code in `server.js`, as identified in `AMENDMENT_09_LIFE_COACHING.md`. The goal is to extract specific sub-features into dedicated modules without altering functionality.

1. Blocking Ambiguity / Founder Decision List
-   Module Structure & Naming: What is the preferred directory structure and naming convention for extracted feature modules? (e.g., `src/features/life-coaching/todos/getTodos.js`, `src/routes/life-coaching.js`, `src/services/life-coaching/todoService.js`). Decision needed on whether to extract by route, by service, or by feature group.
-   Dependency Management: Are there existing common utility functions or db access patterns in `server.js` that should be refactored into shared modules before or during extraction?
-   Error Handling Pattern: Confirm the standard errHdl mw/pattern to apply to extracted routes.

2. Already-Settled Constraints
-   No modification to LifeOS user features or TSOS customer-facing surfaces.
-   Strict adherence to approved builder safe scope.
-   Functionality must remain identical post-extraction.
-   Blueprint: `docs/projects/AMENDMENT_09_LIFE_COACHING.md`.
-   Context: Extract 900 lines of inline endpoint code from `server.js`.

3. Smallest Buildable Next Slice
Extract the `GET /api/life-coaching/todos` endpoint, which retrieves a list of all life coaching todos for the authenticated user. This endpoint is chosen for its read-only nature and minimal side effects, making it a low-risk first extraction.

4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `server.js`: Remove the inline `GET /api/life-coaching/todos` route handler and import the new router/module.
-   `src/features/life-coaching/todo-routes.js` (NEW): Contains the extracted `GET /api/life-coaching/todos` route definition and its handler logic. This file will export an Express Router instance.
-   `src/features/life-coaching/todo-service.js` (NEW, if applicable): If the handler logic is complex, extract business logic into a service layer here.

5. Required Verifier/Runtime Checks
-   Functional Parity: Execute existing integration tests for `GET /api/life-coaching/todos`. If none exist, create a basic test to confirm identical response structure, status codes, and data for various user states (e.g., user with todos, user without todos).
-   No New Dependencies: Verify no new external npm packages are introduced.
-   Code Style: Ensure extracted code adheres to existing ESLint rules and project formatting.
-   Module Resolution: Confirm the new module is correctly imported and resolved by Node ESM.

6. Stop Conditions
-   The `GET /api/life-coaching/todos` endpoint logic is fully extracted from `server.js` into `src/features/life-coaching/todo-routes.js` (and optionally `src/features/life-coaching/todo-service.js`).
-   `server.js` correctly imports and uses the new `todo-routes.js` module.
-   All specified verifier/runtime checks pass.
-   The extracted functionality is confirmed to be identical to the original inline implementation.