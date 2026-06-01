# BuilderOS Remediation: Amendment 14 White Label - Todo 1 (G8)

This memo outlines the next buildable slice for extracting white-label config endpoints, addressing the unchecked blueprint task from `docs/projects/AMENDMENT_14_WHITE_LABEL.md`.

## 1. Blocking Ambiguity or Founder Decision List

*   **Specific Endpoint Identification:** The blueprint refers to "Config endpoints (server.js lines 10171–10198)". The exact paths, HTTP methods, and handler logic for these ~25 lines in `server.js` are not provided.
    *   **Decision Required:** Provide the precise code block from `server.js` (lines 10171-10198) to ensure accurate extraction.
    *   **Assumption (for this memo):** For the purpose of defining the buildable slice, we assume the endpoints to be extracted are placeholder GET routes `/settings` and `/other-endpoint` under `/api/white-label`, as implied by previous attempts. This assumption *must* be validated against the actual `server.js` content.

## 2. Already-Settled Constraints

*   **Source:** Config endpoints currently located in `server.js` (lines 10171-10198).
*   **Target:** Extract these endpoints into `routes/white-label-routes.js`.
*   **Integration:** `server.js` must use `white-label-routes.js` via `app.use('/api/white-label', whiteLabelRoutes);`.
*   **Code Quality:** Adhere to existing Node/ESM patterns, clean, production-quality code.
*   **Scope:** No modification of LifeOS user features or TSOS customer-facing surfaces.
*   **Principle:** Extend existing patterns; do not rebuild.

## 3. Smallest Buildable Next Slice

The immediate next step is to perform the extraction of the identified config endpoints.

1.  **Create/Update `routes/white-label-routes.js`:** Define the extracted config routes within this file.
2.  **Modify `server.js`:**
    *   Remove the original config endpoint definitions from lines 10171-10198.
    *   Add `const whiteLabelRoutes = require('./routes/white-label-routes');` (or `import` if `server.js` is ESM).
    *   Add `app.use('/api/white-label', whiteLabelRoutes);`.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `server.js`
*   `routes/white-label-routes.js`

## 5. Required Verifier/Runtime Checks

*   **Syntax Check:** Verify `server.js` and `routes/white-label-routes.js` are valid Node/ESM JavaScript.
*   **Functional Check:**
    *   Confirm that the `/api/white-label/settings` and `/api/white-label/other-endpoint` (or actual extracted routes) are accessible and return expected responses.
    *   Ensure no other `server.js` functionality is negatively impacted.
*   **Blueprint Compliance:** Verify that the original config endpoint definitions are no longer present in `server.js` within the specified line range (10171-10198).

## 6. Stop Conditions

*   All config endpoints from `server.js` (lines 10171-10198) are successfully moved to `routes/white-label-routes.js`.
*   `server.js` correctly imports and uses `white-label-routes.js` under the `/api/white-label` base path.
*   All verifier/runtime checks pass, confirming functional equivalence and adherence to the blueprint.