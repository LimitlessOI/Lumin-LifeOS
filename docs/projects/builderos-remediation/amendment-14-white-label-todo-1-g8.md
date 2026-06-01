BuilderOS Remediation: Amendment 14 White Label - Todo 1 (G8)
Blueprint Enhancement Memo

This memo outlines the next buildable slice for extracting white-label config endpoints, addressing the open task from `docs/projects/AMENDMENT_14_WHITE_LABEL.md`. The goal is to refactor existing Express route definitions from `server.js` into a dedicated module, improving modularity and maintainability without altering functionality.

---

### 1. Blocking Ambiguity or Founder Decision List

*   **Authentication/Authorization:** Confirm if the extracted routes require any *new* or *different* authentication/authorization middleware compared to what is currently applied to them in `server.js`. *Assumption for build: Maintain existing middleware patterns and application order as found in `server.js`.*
*   **Route Path Structure:** Verify if the extracted routes should retain their exact current paths (e.g., `/config/white-label/branding`) or if a new base path should be introduced for the `white-label-routes.js` module (e.g., mounting the router at `/api/white-label` and defining sub-paths like `/config/branding` within the module). *Assumption for build: Retain exact current paths for minimal change and direct extraction.*

### 2. Already-Settled Constraints

*   **Source Code:** The specific code block for extraction is located in `server.js`, approximately lines 10171–10198. This block contains ~25 lines of Express route definitions related to white-label configuration.
*   **Destination File:** The extracted routes must be moved to `routes/white-label-routes.js`.
*   **Impact Scope:** No modifications to LifeOS user features or TSOS customer-facing surfaces are permitted. This is an internal refactoring.
*   **Coding Standards:** Adherence to existing Node/ESM patterns and clean, production-quality code is required.