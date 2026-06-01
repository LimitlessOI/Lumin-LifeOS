BuilderOS Remediation: Amendment 14 White Label - Todo 1 (G8)
Blueprint Enhancement Memo

This memo outlines the next buildable slice for extracting white-label config endpoints, addressing the open task from `docs/projects/AMENDMENT_14_WHITE_LABEL.md`.

1.  **Blocking Ambiguity or Founder Decision List**
    *   **Route Registration Pattern:** Assume standard Express Router pattern for `routes/white-label-routes.js` (e.g., `const router = express.Router(); router.get(...)`).
    *   **Base Path for Router:** Assume the new `white-label-routes` will be mounted under `/api/white-label` in `server.js` to maintain logical grouping and avoid conflicts. Confirmation needed if a different base path is intended.

2.  **Already-Settled Constraints**
    *   **No User/Customer Impact:** Modifications must not affect LifeOS user features or TSOS customer-facing surfaces. This is an internal refactor.
    *   **Extraction Only:** The task is to extract existing code, not to implement new features or alter existing endpoint behavior.
    *   **Source Lines:** The specific code block to extract is `server.js` lines 10171–10198.
    *   **Target File:** The extracted code will reside in a new file: `routes/white-label-routes.js`.

3.  **The Smallest Buildable Next Slice**
    *   **Create `routes/white-label-routes.js`:** Initialize this file with an Express Router.
    *   **Extract Endpoints:** Move the ~25 lines of config endpoint definitions from `server.js` (10171–10198) into `routes/white-label-routes.js`, attaching them to the new router.
    *   **Integrate Router in `server.js`:** Modify `server.js` to import `routes/white-label-routes.js` and mount the router using `app.use('/api/white-label', whiteLabelRoutes);` (or similar, based on founder decision).
    *   **Remove Original Code:** Delete the original lines 10171–10198 from `server.js`.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First**
    *   `server.js`
    *   `routes/white-label-routes.js` (new file creation)

5.  **Required Verifier/Runtime Checks**
    *   **Functional Verification:** Execute API calls to all white-label config endpoints that were previously defined in `server.js` (e.g., `/config/white-label/settings`). Verify they return the expected responses via their new `/api/white-label/...` paths.
    *   **No Regressions:** Ensure no other existing routes or application functionality are impacted.
    *   **Code Review:** Confirm `server.js` no longer contains the extracted lines and correctly imports/uses the new router. Confirm `routes/white-label-routes.js` contains the extracted routes and exports the router.

6.  **Stop Conditions**
    *   The code block from `server.js` lines 10171–10198 is completely removed.
    *   A new file `routes/white-label-routes.js` exists and contains the extracted white-label config endpoint definitions.
    *   `server.js` correctly integrates the new `white-label-routes` router.
    *   All previously functional white-label config endpoints remain fully operational and accessible via their new, refactored paths.
    *   No new issues or regressions are identified by verifier checks.