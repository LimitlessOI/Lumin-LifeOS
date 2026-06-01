BuilderOS Remediation: Amendment 12 Command Center - TODO-11-G4 Enhancement Memo

Target: `/api/v1/admin/ai/status` - Show Current AI Enabled State

This memo outlines the next buildable slice for implementing the `/api/v1/admin/ai/status` endpoint as per `AMENDMENT_12_COMMAND_CENTER.md`. The goal is to provide a builder-ready enhancement memo, not direct code, to address the previous verifier rejection.

---

### 1. Blocking Ambiguity or Founder Decision List

*   **Response Schema:** Exact JSON schema for the `/api/v1/admin/ai/status` response. Is it a simple `{ enabled: boolean }` or more detailed (e.g., including AI model version, last updated timestamp)?
*   **Source of Truth for AI State:** Where is the "AI enabled state" definitively stored? (e.g., `process.env.AI_ENABLED`, a database configuration table, a feature flag service, a specific service's internal state).
*   **Authentication/Authorization:** Specific roles or permissions required for accessing this `/admin` endpoint beyond general admin access.

### 2. Already-Settled Constraints

*   **Endpoint:** `GET /api/v1/admin/ai/status`
*   **Purpose:** Report the current AI enabled state.
*   **Scope:** BuilderOS-only governed loop execution. No modifications to LifeOS user features or TSOS customer-facing surfaces.
*   **Technology:** Node/ESM, follow existing patterns. Extend, do not rebuild.
*   **Output Format:** This document is a markdown memo, not executable code.

### 3. Smallest Buildable Next Slice

Implement the `GET /api/v1/admin/ai/status` endpoint to return a simple JSON object indicating the AI enabled state. For this initial slice, the state will be read from an environment variable `AI_ENABLED`. If `AI_ENABLED` is not set or is 'false'/'0', it will be considered disabled. Otherwise, it's enabled. This provides a functional, testable endpoint without requiring database changes or complex service integrations in the first iteration.

Example response:
```json
{
  "enabled": true
}
```

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

Assuming a standard Node.js/Express API structure:

*   `src/api/v1/admin/ai/status.js`: Create this new file to define the route and its handler. This file will export a router or a handler function that can be integrated into the main admin router.
*   `src/api/v1/admin/index.js` (or similar existing admin router file): Modify to import and mount the new `status.js` route.

### 5. Required Verifier/Runtime Checks

*   **Syntax Check:** Ensure `src/api/v1/admin/ai/status.js` is valid Node/ESM syntax.
*   **Endpoint Reachability:** `GET /api/v1/admin/ai/status` returns HTTP 200 OK.
*   **Response Structure:** The response body is valid JSON and matches `{ "enabled": boolean }`.
*   **Environment Variable Reflection:**
    *   Set `AI_ENABLED=true` in the environment, then `GET /api/v1/admin/ai/status` returns `{ "enabled": true }`.
    *   Set `AI_ENABLED=false` (or unset it) in the environment, then `GET /api/v1/admin/ai/status` returns `{ "enabled": false }`.
*   **No Regressions:** Existing `/api/v1/admin/*` endpoints remain functional.

### 6. Stop Conditions

*   The `GET /api/v1/admin/ai/status` endpoint is deployed and returns a JSON object `{ "enabled": boolean }`.
*   The `enabled` value accurately reflects the `AI_ENABLED` environment variable.
*   The implementation adheres to existing Node/ESM code patterns and project conventions.
*   No unintended side effects or regressions are observed in other parts of the system.
*   The solution is minimal and directly addresses the blueprint's requirement to "show current AI enabled state" via the specified endpoint.